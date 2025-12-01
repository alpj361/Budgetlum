import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { SmartExtractionService, ExtractedData } from "../services/smartExtractionService";
import { DataSyncService } from "../services/dataSyncService";
import { BussyAIService } from "../services/bussyAIService";
import { useUserStore } from "../state/userStore";
import { getOpenAITextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";
import { DataCollectionService } from "../services/dataCollectionService";
import { getCurrencySymbol } from "../types/centralAmerica";

export type ChatRole = "user" | "assistant";
export type ChatMode = "onboarding" | "standard";
export type OnboardingPhase = "introduction" | "income" | "expenses" | "goals" | "budget_creation" | "confirmation";

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
  mode: ChatMode;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}

interface UnifiedChatContextValue {
  messages: ChatMessage[];
  isTyping: boolean;
  lastExtraction: ExtractedData | null;
  validation: ChatValidationState | null;
  syncSummary: SyncSummary | null;
  sessionConfig: ChatSessionConfig;
  onboardingPhase: OnboardingPhase;
  setMode: (mode: ChatMode) => void;
  setOnboardingPhase: (phase: OnboardingPhase) => void;
  sendUserMessage: (content: string) => Promise<ChatMessage | null>;
  resetConversation: () => void;
  canFinishOnboarding: () => boolean;
}

const UnifiedChatContext = createContext<UnifiedChatContextValue | undefined>(undefined);

const createMessage = (role: ChatRole, content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
});

const DEFAULT_OPTIONS = {
  temperature: 0.7,
  maxTokens: 1024,
};

export const UnifiedChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionConfig, setSessionConfig] = useState<ChatSessionConfig>({
    mode: "standard",
    ...DEFAULT_OPTIONS,
  });
  const [isTyping, setIsTyping] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<ExtractedData | null>(null);
  const [validation, setValidation] = useState<ChatValidationState | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>("introduction");

  const messagesRef = useRef<ChatMessage[]>([]);

  const setMode = useCallback((mode: ChatMode) => {
    setSessionConfig((prev) => ({ ...prev, mode }));
  }, []);

  const resetConversation = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setIsTyping(false);
    setLastExtraction(null);
    setValidation(null);
    setSyncSummary(null);
    setOnboardingPhase("introduction");
  }, []);

  const canFinishOnboarding = useCallback(() => {
    const state = useUserStore.getState();
    // Check if we have at least one income and some budget categories or expenses detected
    const hasIncomes = state.incomes.length > 0;
    const hasExpenses = lastExtraction?.expenses.length ?? 0 > 0;
    const isInFinalPhase = onboardingPhase === "budget_creation" || onboardingPhase === "confirmation";
    
    return hasIncomes && hasExpenses && isInFinalPhase;
  }, [lastExtraction, onboardingPhase]);

  const sendUserMessage = useCallback<UnifiedChatContextValue["sendUserMessage"]>(
    async (content) => {
      if (!content.trim()) {
        return null;
      }

      const userMessage = createMessage("user", content.trim());
      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages(messagesRef.current);

      setIsTyping(true);

      try {
        const state = useUserStore.getState();
        const currencySymbol = getCurrencySymbol(state.userProfile?.country || "GT");

        let assistantResponse: string;

        if (sessionConfig.mode === "onboarding") {
          // ONBOARDING MODE: Extract data and generate contextual response
          
          // 1. Extract financial data from message
          const extractionContext = {
            profile: state.userProfile,
            incomes: state.incomes,
            userCountry: state.userProfile?.country || "GT",
            phase: onboardingPhase,
          };

          const extracted = await SmartExtractionService.extractFromMessage(
            userMessage.content,
            extractionContext
          );
          setLastExtraction(extracted);

          // 2. Validate and sync extracted data
          const validationResult = SmartExtractionService.validateExtraction(extracted);
          setValidation({
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            suggestions: validationResult.suggestions,
            schemaErrors: [],
          });

          const storeSnapshot = {
            incomes: state.incomes,
            userProfile: state.userProfile,
            addIncome: state.addIncome,
            updateIncome: state.updateIncome,
            updateProfile: state.updateProfile,
            addGoal: state.addGoal,
          };

          const syncReport = DataSyncService.syncExtractedData(extracted, storeSnapshot);
          setSyncSummary(syncReport);

          // 3. Generate AI response based on phase and extracted data
          assistantResponse = await generateOnboardingResponse(
            userMessage.content,
            extracted,
            validationResult,
            onboardingPhase,
            state,
            currencySymbol
          );

          // 4. Update phase based on progress
          updatePhaseBasedOnProgress(extracted, setOnboardingPhase, onboardingPhase);
        } else {
          // STANDARD MODE: Conversational AI for post-onboarding
          const context = {
            userProfile: state.userProfile,
            incomes: state.incomes,
            budgets: state.budgets,
            goals: state.userProfile.financialGoals,
            totalIncome: state.getTotalIncome("monthly"),
          };

          const systemPrompt = buildStandardModePrompt(context, currencySymbol);

          const conversation: AIMessage[] = [
            { role: "system", content: systemPrompt },
            ...messagesRef.current.map<AIMessage>((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          ];

          const response = await getOpenAITextResponse(conversation, {
            temperature: sessionConfig.temperature ?? DEFAULT_OPTIONS.temperature,
            maxTokens: sessionConfig.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
          });

          assistantResponse = response.content.trim();
        }

        const assistantMessage = createMessage("assistant", assistantResponse);
        messagesRef.current = [...messagesRef.current, assistantMessage];
        setMessages(messagesRef.current);
        setIsTyping(false);
        return assistantMessage;
      } catch (error) {
        console.error("UnifiedChatContext send message error", error);
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
    [sessionConfig, onboardingPhase]
  );

  const value = useMemo<UnifiedChatContextValue>(
    () => ({
      messages,
      isTyping,
      lastExtraction,
      validation,
      syncSummary,
      sessionConfig,
      onboardingPhase,
      setMode,
      setOnboardingPhase,
      sendUserMessage,
      resetConversation,
      canFinishOnboarding,
    }),
    [
      messages,
      isTyping,
      lastExtraction,
      validation,
      syncSummary,
      sessionConfig,
      onboardingPhase,
      setMode,
      sendUserMessage,
      resetConversation,
      canFinishOnboarding,
    ]
  );

  return <UnifiedChatContext.Provider value={value}>{children}</UnifiedChatContext.Provider>;
};

export const useUnifiedChat = () => {
  const context = useContext(UnifiedChatContext);
  if (!context) {
    throw new Error("useUnifiedChat must be used within a UnifiedChatProvider");
  }
  return context;
};

// Helper functions

async function generateOnboardingResponse(
  userMessage: string,
  extracted: ExtractedData,
  validation: any,
  phase: OnboardingPhase,
  state: any,
  currencySymbol: string
): Promise<string> {
  const systemPrompt = buildOnboardingPrompt(phase, extracted, state, currencySymbol, validation);

  const conversation: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const response = await getOpenAITextResponse(conversation, {
    temperature: 0.7,
    maxTokens: 1024,
  });

  return response.content.trim();
}

function buildOnboardingPrompt(
  phase: OnboardingPhase,
  extracted: ExtractedData,
  state: any,
  currencySymbol: string,
  validation: any
): string {
  const basePrompt = `Eres Bussy, el asistente financiero amigable de Budgetlum. Estás ayudando al usuario a configurar su presupuesto durante el onboarding.

**FASE ACTUAL: ${phase.toUpperCase()}**

**Tu personalidad:**
- 🤗 Conversacional, cálido y empático
- 😊 Usa emojis para crear conexión
- 💡 Proactivo y curioso sobre la situación del usuario
- 🎯 Guías paso a paso sin abrumar
- 🌟 Alentador y positivo

**Contexto del usuario:**
- País: ${state.userProfile?.country || "GT"} (${currencySymbol})
- Ingresos registrados: ${state.incomes.length}
- Metas registradas: ${state.userProfile.financialGoals.length}

**Datos detectados en este mensaje:**
- Ingresos: ${extracted.incomes.length}
- Gastos: ${extracted.expenses.length}
- Metas: ${extracted.goals.length}
`;

  switch (phase) {
    case "introduction":
      return (
        basePrompt +
        `\n**Instrucciones para esta fase:**\n1. Da la bienvenida cálida y explica que vas a ayudar a crear su presupuesto\n2. Explica que harás preguntas sobre ingresos, gastos y metas\n3. Pide que comience contándote sobre sus ingresos principales\n4. Sé específico: pregunta montos, frecuencias (mensual, quincenal, etc.) y fechas de pago\n5. Mantén el tono conversacional y amigable\n\nRespuestas cortas (2-3 párrafos máximo).`
      );

    case "income":
      return (
        basePrompt +
        `\n**Datos de ingresos hasta ahora:**\n${extracted.incomes.map((inc, i) => `${i + 1}. ${inc.name || "Ingreso"}: ${currencySymbol}${inc.amount?.toLocaleString()} (${inc.frequency})`).join("\n")}\n\n**Instrucciones:**\n1. Confirma específicamente los ingresos que detectaste\n2. Si faltan detalles (fechas, montos exactos), pregunta amablemente\n3. Valida si los datos son correctos\n4. Si ya tienes suficiente info de ingresos, pregunta sobre gastos\n5. Usa validación: ${validation.errors.length > 0 ? validation.errors.join(", ") : "Todo bien"}\n\nOfrece 1-2 preguntas claras y específicas.`
      );

    case "expenses":
      return (
        basePrompt +
        `\n**Gastos detectados hasta ahora:**\n${extracted.expenses.map((exp, i) => `${i + 1}. ${exp.category}: ${currencySymbol}${exp.amount?.toLocaleString()} (${exp.frequency})`).join("\n")}\n\n**Instrucciones:**\n1. Confirma los gastos detectados\n2. Pregunta por las principales categorías: vivienda, alimentación, transporte, etc.\n3. Acepta respuestas aproximadas: "como 2000", "entre 1500-2000"\n4. Si ya tienes 3+ categorías de gastos, avanza a metas financieras\n5. Sugiere categorías comunes si el usuario no sabe qué mencionar\n\nSé específico y práctico en tus preguntas.`
      );

    case "goals":
      return (
        basePrompt +
        `\n**Metas detectadas:**\n${extracted.goals.map((goal, i) => `${i + 1}. ${goal.title}: ${currencySymbol}${goal.targetAmount?.toLocaleString()}`).join("\n")}\n\n**Instrucciones:**\n1. Pregunta sobre metas financieras: ahorro de emergencia, compras grandes, deudas\n2. Si no tienen metas claras, sugiere comenzar con fondo de emergencia\n3. Acepta metas simples o complejas\n4. Después de obtener 1-2 metas (o si no tienen), avanza a crear el presupuesto\n\nMantén el tono motivador y positivo.`
      );

    case "budget_creation":
      return (
        basePrompt +
        `\n**Resumen de datos recopilados:**\n- Ingresos: ${state.incomes.length} fuente(s)\n- Gastos: ${extracted.expenses.length} categoría(s)\n- Metas: ${state.userProfile.financialGoals.length}\n\n**Instrucciones:**\n1. Informa al usuario que vas a crear su presupuesto personalizado\n2. Explica que usarás sus ingresos y gastos para distribuir su dinero\n3. Menciona que puede ver y ajustar el presupuesto en cualquier momento\n4. Pregunta si hay algo más que quiera añadir antes de finalizar\n5. Avanza a fase de confirmación\n\nSé entusiasta y celebra el progreso.`
      );

    case "confirmation":
      return (
        basePrompt +
        `\n**Instrucciones:**\n1. Felicita al usuario por completar la configuración\n2. Resume brevemente lo que se configuró\n3. Menciona que el presupuesto está listo y puede verlo en la pantalla de Presupuesto\n4. Explica que puede chatear contigo en cualquier momento para ajustes\n5. Invita a finalizar el onboarding\n\nCierra con un mensaje motivador y positivo.`
      );

    default:
      return basePrompt;
  }
}

function buildStandardModePrompt(context: any, currencySymbol: string): string {
  return `Eres Bussy, el asistente financiero inteligente de Budgetlum. El usuario ya completó el onboarding y ahora usa la app.

**Tu rol:**
- Responder preguntas sobre finanzas personales
- Dar consejos personalizados basados en su situación
- Ayudar a ajustar presupuestos, añadir gastos, actualizar metas
- Analizar su situación financiera y dar insights
- Ser conversacional, amigable y práctico

**Contexto del usuario:**
- Ingreso mensual total: ${currencySymbol}${context.totalIncome?.toLocaleString() || "0"}
- Fuentes de ingreso: ${context.incomes.length}
- Presupuestos activos: ${context.budgets.length}
- Metas financieras: ${context.goals.length}

**Capacidades:**
- Puedes sugerir ajustes al presupuesto
- Puedes analizar patrones de gasto
- Puedes dar consejos para alcanzar metas
- Puedes responder preguntas financieras generales

**Estilo de respuesta:**
- Conversacional y amigable
- Práctico y accionable
- Usa emojis apropiadamente
- Respuestas concisas (2-4 párrafos)
- Adapta tu tono al del usuario

Responde de manera útil y personalizada a las necesidades del usuario.`;
}

function updatePhaseBasedOnProgress(
  extracted: ExtractedData,
  setPhase: (phase: OnboardingPhase) => void,
  currentPhase: OnboardingPhase
) {
  // Auto-progress through phases based on data collected
  const state = useUserStore.getState();

  if (currentPhase === "introduction" && extracted.incomes.length > 0) {
    setPhase("income");
  } else if (currentPhase === "income" && state.incomes.length > 0 && extracted.expenses.length > 0) {
    setPhase("expenses");
  } else if (currentPhase === "expenses" && extracted.expenses.length >= 3) {
    setPhase("goals");
  } else if (currentPhase === "goals" && (extracted.goals.length > 0 || state.userProfile.financialGoals.length > 0)) {
    setPhase("budget_creation");
  } else if (currentPhase === "budget_creation") {
    setPhase("confirmation");
  }
}
