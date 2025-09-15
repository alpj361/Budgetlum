import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile, FinancialGoal, IncomeSource } from "../types/user";
import { calculateMonthlyIncome } from "../utils/incomeCalculations";

interface UserStore {
  userProfile: UserProfile;
  incomes: IncomeSource[];

  // Profile actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;

  // Income actions
  addIncome: (income: Omit<IncomeSource, "id">) => void;
  updateIncome: (id: string, updates: Partial<IncomeSource>) => void;
  deleteIncome: (id: string) => void;
  setPrimaryIncome: (id: string) => void;

  // Goals actions
  addGoal: (goal: Omit<FinancialGoal, "id">) => void;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;

  // Computed values
  getTotalIncome: (frequency?: "monthly" | "yearly") => number;
  getPrimaryIncome: () => IncomeSource | undefined;
  getActiveGoals: () => FinancialGoal[];
  isOnboardingComplete: () => boolean;

  // Maintenance
  resetUserData: () => Promise<void>;
}

const createDefaultProfile = (): UserProfile => ({
  name: "",
  nickname: "",
  lifeStage: "",
  budgetingExperience: "",
  financialGoals: [],
  spendingStyle: "",
  isOnboardingComplete: false,
  onboardingVersion: 1,
  onboardingStep: 0,
  preferredBudgetPeriod: "",
  enableBussyGuidance: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 11);

const STORAGE_KEY = "user-store";

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      userProfile: createDefaultProfile(),
      incomes: [],

      updateProfile: (updates) => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      completeOnboarding: () => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            isOnboardingComplete: true,
            onboardingStep: -1,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      setOnboardingStep: (step) => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            onboardingStep: step,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      resetOnboarding: () => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            isOnboardingComplete: false,
            onboardingStep: 0,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      addIncome: (income) => {
        const newIncome: IncomeSource = {
          ...income,
          id: generateId(),
          isPrimary: income.isPrimary || get().incomes.length === 0, // Use provided isPrimary or first income is primary
          paymentPattern: income.paymentPattern || "simple", // Default to simple if not provided
        };

        set((state) => ({
          incomes: [...state.incomes, newIncome],
        }));
      },

      updateIncome: (id, updates) => {
        set((state) => ({
          incomes: state.incomes.map((income) =>
            income.id === id
              ? { ...income, ...updates }
              : income
          ),
        }));
      },

      deleteIncome: (id) => {
        const { incomes } = get();
        const deletingPrimary = incomes.find(i => i.id === id)?.isPrimary;

        set((state) => {
          const newIncomes = state.incomes.filter((income) => income.id !== id);

          // If we deleted the primary income, make the first remaining one primary
          if (deletingPrimary && newIncomes.length > 0) {
            newIncomes[0].isPrimary = true;
          }

          return { incomes: newIncomes };
        });
      },

      setPrimaryIncome: (id) => {
        set((state) => ({
          incomes: state.incomes.map((income) => ({
            ...income,
            isPrimary: income.id === id,
          })),
        }));
      },

      addGoal: (goal) => {
        const newGoal: FinancialGoal = {
          ...goal,
          id: generateId(),
        };

        set((state) => ({
          userProfile: {
            ...state.userProfile,
            financialGoals: [...state.userProfile.financialGoals, newGoal],
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            financialGoals: state.userProfile.financialGoals.map((goal) =>
              goal.id === id ? { ...goal, ...updates } : goal
            ),
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      deleteGoal: (id) => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            financialGoals: state.userProfile.financialGoals.filter((goal) => goal.id !== id),
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      getTotalIncome: (frequency = "monthly") => {
        const { incomes } = get();

        return incomes
          .filter(income => income.isActive)
          .reduce((total, income) => {
            const monthlyAmount = calculateMonthlyIncome(income);

            if (frequency === "yearly") {
              return total + (monthlyAmount * 12);
            }

            return total + monthlyAmount;
          }, 0);
      },

      getPrimaryIncome: () => {
        return get().incomes.find(income => income.isPrimary && income.isActive);
      },

      getActiveGoals: () => {
        return get().userProfile.financialGoals.filter(goal => goal.isActive);
      },

      isOnboardingComplete: () => {
        return get().userProfile.isOnboardingComplete;
      },

      resetUserData: async () => {
        set({
          userProfile: createDefaultProfile(),
          incomes: [],
        });
        await AsyncStorage.removeItem(STORAGE_KEY);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        userProfile: state.userProfile,
        incomes: state.incomes,
      }),
    }
  )
);