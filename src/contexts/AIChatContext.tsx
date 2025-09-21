import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { getOpenAITextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";
import { SmartExtractionService, ExtractedData } from "../services/smartExtractionService";
import { DataSyncService } from "../services/dataSyncService";
import { useUserStore } from "../state/userStore";
import { validateIncomeInput, validatePreferencesInput } from "../utils/validation/schemas";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatValidationState {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  schemaErrors: string[];
}

export interface SyncSummary {
  incomesCreated: number;
  incomesUpdated: number;
  goalsCreated: number;
  profileUpdated: boolean;
}

export interface ChatSessionConfig {
  systemPrompt: string;
  context?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}

interface SendMessageOptions {
  context?: Record<string, unknown>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  skipExtraction?: boolean;
}

interface AIChatContextValue {
  messages: ChatMessage[];
  isTyping: boolean;
  lastExtraction: ExtractedData | null;
  validation: ChatValidationState | null;
  syncSummary: SyncSummary | null;
  sessionConfig: ChatSessionConfig | null;
  configureSession: (config: ChatSessionConfig) => void;
  sendUserMessage: (content: string, options?: SendMessageOptions) => Promise<ChatMessage | null>;
  resetConversation: () => void;
}

const AIChatContext = createContext<AIChatContextValue | undefined>(undefined);

const createMessage = (role: ChatRole, content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
});

const DEFAULT_OPTIONS = {
  temperature: 0.6,
  maxTokens: 900,
};

export const AIChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionConfig, setSessionConfig] = useState<ChatSessionConfig | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<ExtractedData | null>(null);
  const [validation, setValidation] = useState<ChatValidationState | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);

  const configureSession = useCallback((config: ChatSessionConfig) => {
    setSessionConfig(config);
  }, []);

  const resetConversation = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setIsTyping(false);
    setLastExtraction(null);
    setValidation(null);
    setSyncSummary(null);
  }, []);

  const sendUserMessage = useCallback<AIChatContextValue["sendUserMessage"]>(
    async (content, options) => {
      if (!content.trim()) {
        return null;
      }

      const activeConfig = {
        ...DEFAULT_OPTIONS,
        ...(sessionConfig ?? {}),
        ...(options ?? {}),
      } as Required<Pick<ChatSessionConfig, "systemPrompt">> & ChatSessionConfig;

      if (!activeConfig.systemPrompt) {
        throw new Error("AIChatProvider: systemPrompt is required before sending messages");
      }

      const userMessage = createMessage("user", content.trim());
      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages(messagesRef.current);

      setIsTyping(true);

      let extracted: ExtractedData | null = null;
      let validationState: ChatValidationState | null = null;
      let syncReport: SyncSummary | null = null;

      try {
        if (!options?.skipExtraction) {
          const state = useUserStore.getState();
          const storeSnapshot = {
            incomes: state.incomes,
            userProfile: state.userProfile,
            addIncome: state.addIncome,
            updateIncome: state.updateIncome,
            updateProfile: state.updateProfile,
            addGoal: state.addGoal,
          };

          const extractionContext = {
            ...activeConfig.context,
            ...options?.context,
            profile: storeSnapshot.userProfile,
            incomes: storeSnapshot.incomes,
          };

          extracted = await SmartExtractionService.extractFromMessage(userMessage.content, extractionContext);
          setLastExtraction(extracted);

          const validationResult = SmartExtractionService.validateExtraction(extracted);

          const schemaErrors: string[] = [];

          if (extracted.incomes.length > 0) {
            extracted.incomes.forEach((income) => {
              const errors = validateIncomeInput({
                amount: income.amount,
                frequency: income.frequency,
                type: income.type,
                paymentDates: income.paymentDates,
                description: income.description,
              });
              schemaErrors.push(...errors);
            });
          }

          schemaErrors.push(...validatePreferencesInput(extracted.preferences));

          validationState = {
            isValid: validationResult.isValid && schemaErrors.length === 0,
            errors: validationResult.errors,
            suggestions: validationResult.suggestions,
            schemaErrors,
          };
          setValidation(validationState);

          syncReport = DataSyncService.syncExtractedData(extracted, storeSnapshot);
          setSyncSummary(syncReport);
        }
      } catch (error) {
        console.error("AIChatProvider extraction error", error);
      }

      try {
        const conversation: AIMessage[] = [
          { role: "system", content: activeConfig.systemPrompt },
          ...messagesRef.current.map<AIMessage>((message) => ({
            role: message.role,
            content: message.content,
          })),
        ];

        const response = await getOpenAITextResponse(conversation, {
          temperature: activeConfig.temperature ?? DEFAULT_OPTIONS.temperature,
          maxTokens: activeConfig.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
        });

        const assistantMessage = createMessage("assistant", response.content.trim());
        messagesRef.current = [...messagesRef.current, assistantMessage];
        setMessages(messagesRef.current);
        setIsTyping(false);
        return assistantMessage;
      } catch (error) {
        console.error("AIChatProvider send message error", error);
        const fallbackMessage = createMessage(
          "assistant",
          "Perdón, tuve un problema interpretando tu mensaje. ¿Puedes explicarlo de otra manera?"
        );
        messagesRef.current = [...messagesRef.current, fallbackMessage];
        setMessages(messagesRef.current);
        setIsTyping(false);
        return fallbackMessage;
      }
    },
    [sessionConfig]
  );

  const value = useMemo<AIChatContextValue>(
    () => ({
      messages,
      isTyping,
      lastExtraction,
      validation,
      syncSummary,
      sessionConfig,
      configureSession,
      sendUserMessage,
      resetConversation,
    }),
    [messages, isTyping, lastExtraction, validation, syncSummary, sessionConfig, configureSession, sendUserMessage, resetConversation]
  );

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
};
