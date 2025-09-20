import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AIAction } from "../services/aiActionService";
import { ParsedIncome } from "../utils/incomeParser";
import { FinancialGoal } from "../types/user";

export type ConversationStep =
  | 'WELCOME'
  | 'INCOME_SETUP'
  | 'INCOME_CONFIRM'
  | 'PREFERENCES'
  | 'SPENDING_ANALYSIS'
  | 'BUDGET_GENERATION'
  | 'BUDGET_CONFIRM'
  | 'COMPLETE'
  | 'STANDARD_CHAT';

export interface UserPreferences {
  spendingStyle: 'conservative' | 'moderate' | 'flexible';
  budgetPriorities: string[];
  savingsGoalPercentage: number;
  preferredBudgetPeriod: 'weekly' | 'monthly' | 'quarterly';
  autoAdjustBudgets: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

export interface AdvancedModeState {
  currentStep: ConversationStep;
  collectedData: {
    incomes: ParsedIncome[];
    preferences: Partial<UserPreferences>;
    goals: Partial<FinancialGoal>[];
    spendingPatterns: string[];
  };
  pendingActions: AIAction[];
  stepProgress: {
    incomeSetupComplete: boolean;
    preferencesComplete: boolean;
    budgetGenerated: boolean;
  };
}

interface ConversationStore {
  // Current mode state
  currentMode: 'standard' | 'advanced';
  advancedModeState: AdvancedModeState;
  conversationHistory: Message[];

  // Actions
  setMode: (mode: 'standard' | 'advanced') => void;
  updateConversationStep: (step: ConversationStep) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  addPendingAction: (action: AIAction) => void;
  removePendingAction: (actionId: string) => void;
  clearPendingActions: () => void;

  // Advanced mode data management
  updateCollectedIncomes: (incomes: ParsedIncome[]) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addGoal: (goal: Partial<FinancialGoal>) => void;
  updateStepProgress: (step: keyof AdvancedModeState['stepProgress'], completed: boolean) => void;

  // Conversation flow
  getNextStep: () => ConversationStep;
  canProceedToNextStep: () => boolean;
  resetAdvancedMode: () => void;

  // State queries
  isAdvancedModeActive: () => boolean;
  getCurrentStepProgress: () => number;
  getCompletedSteps: () => ConversationStep[];

  // Persistence
  saveConversationState: () => void;
  loadConversationState: () => void;
  clearHistory: () => void;
}

const createDefaultAdvancedModeState = (): AdvancedModeState => ({
  currentStep: 'WELCOME',
  collectedData: {
    incomes: [],
    preferences: {},
    goals: [],
    spendingPatterns: []
  },
  pendingActions: [],
  stepProgress: {
    incomeSetupComplete: false,
    preferencesComplete: false,
    budgetGenerated: false
  }
});

const generateMessageId = () => Date.now().toString() + Math.random().toString(36).substring(2, 11);

const STORAGE_KEY = "conversation-store";

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      currentMode: 'standard',
      advancedModeState: createDefaultAdvancedModeState(),
      conversationHistory: [],

      setMode: (mode) => {
        set((state) => ({
          currentMode: mode,
          // Reset advanced mode when switching to standard
          advancedModeState: mode === 'standard'
            ? createDefaultAdvancedModeState()
            : state.advancedModeState
        }));
      },

      updateConversationStep: (step) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            currentStep: step
          }
        }));
      },

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateMessageId(),
          timestamp: new Date()
        };

        set((state) => ({
          conversationHistory: [...state.conversationHistory, newMessage]
        }));
      },

      addPendingAction: (action) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            pendingActions: [...state.advancedModeState.pendingActions, action]
          }
        }));
      },

      removePendingAction: (actionId) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            pendingActions: state.advancedModeState.pendingActions.filter(
              action => action.conversationId !== actionId
            )
          }
        }));
      },

      clearPendingActions: () => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            pendingActions: []
          }
        }));
      },

      updateCollectedIncomes: (incomes) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            collectedData: {
              ...state.advancedModeState.collectedData,
              incomes
            }
          }
        }));
      },

      updatePreferences: (preferences) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            collectedData: {
              ...state.advancedModeState.collectedData,
              preferences: {
                ...state.advancedModeState.collectedData.preferences,
                ...preferences
              }
            }
          }
        }));
      },

      addGoal: (goal) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            collectedData: {
              ...state.advancedModeState.collectedData,
              goals: [...state.advancedModeState.collectedData.goals, goal]
            }
          }
        }));
      },

      updateStepProgress: (step, completed) => {
        set((state) => ({
          advancedModeState: {
            ...state.advancedModeState,
            stepProgress: {
              ...state.advancedModeState.stepProgress,
              [step]: completed
            }
          }
        }));
      },

      getNextStep: () => {
        const { advancedModeState } = get();
        const { currentStep, stepProgress } = advancedModeState;

        switch (currentStep) {
          case 'WELCOME':
            return 'INCOME_SETUP';
          case 'INCOME_SETUP':
            return 'INCOME_CONFIRM';
          case 'INCOME_CONFIRM':
            return stepProgress.incomeSetupComplete ? 'PREFERENCES' : 'INCOME_SETUP';
          case 'PREFERENCES':
            return 'SPENDING_ANALYSIS';
          case 'SPENDING_ANALYSIS':
            return 'BUDGET_GENERATION';
          case 'BUDGET_GENERATION':
            return 'BUDGET_CONFIRM';
          case 'BUDGET_CONFIRM':
            return 'COMPLETE';
          case 'COMPLETE':
            return 'STANDARD_CHAT';
          default:
            return 'WELCOME';
        }
      },

      canProceedToNextStep: () => {
        const { advancedModeState } = get();
        const { currentStep, stepProgress, collectedData } = advancedModeState;

        switch (currentStep) {
          case 'WELCOME':
            return true;
          case 'INCOME_SETUP':
            return collectedData.incomes.length > 0;
          case 'INCOME_CONFIRM':
            return stepProgress.incomeSetupComplete;
          case 'PREFERENCES':
            return Object.keys(collectedData.preferences).length > 0;
          case 'SPENDING_ANALYSIS':
            return collectedData.spendingPatterns.length > 0;
          case 'BUDGET_GENERATION':
            return true; // Can always generate budget if we have income
          case 'BUDGET_CONFIRM':
            return stepProgress.budgetGenerated;
          case 'COMPLETE':
            return true;
          default:
            return false;
        }
      },

      resetAdvancedMode: () => {
        set({
          advancedModeState: createDefaultAdvancedModeState(),
          currentMode: 'standard'
        });
      },

      isAdvancedModeActive: () => {
        return get().currentMode === 'advanced';
      },

      getCurrentStepProgress: () => {
        const { advancedModeState } = get();
        const totalSteps = 7; // WELCOME through COMPLETE
        const stepOrder: ConversationStep[] = [
          'WELCOME', 'INCOME_SETUP', 'INCOME_CONFIRM',
          'PREFERENCES', 'SPENDING_ANALYSIS', 'BUDGET_GENERATION', 'COMPLETE'
        ];

        const currentIndex = stepOrder.indexOf(advancedModeState.currentStep);
        return Math.max(0, (currentIndex + 1) / totalSteps);
      },

      getCompletedSteps: () => {
        const { advancedModeState } = get();
        const { stepProgress, currentStep } = advancedModeState;
        const completed: ConversationStep[] = [];

        if (stepProgress.incomeSetupComplete) {
          completed.push('INCOME_SETUP', 'INCOME_CONFIRM');
        }
        if (stepProgress.preferencesComplete) {
          completed.push('PREFERENCES');
        }
        if (stepProgress.budgetGenerated) {
          completed.push('BUDGET_GENERATION');
        }

        // Add current step if it's past welcome
        if (currentStep !== 'WELCOME' && !completed.includes(currentStep)) {
          completed.push(currentStep);
        }

        return completed;
      },

      saveConversationState: () => {
        // This is handled automatically by Zustand persist
      },

      loadConversationState: () => {
        // This is handled automatically by Zustand persist
      },

      clearHistory: () => {
        set({
          conversationHistory: [],
          advancedModeState: createDefaultAdvancedModeState(),
          currentMode: 'standard'
        });
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        currentMode: state.currentMode,
        advancedModeState: state.advancedModeState,
        conversationHistory: state.conversationHistory.slice(-50) // Keep last 50 messages
      }),
    }
  )
);