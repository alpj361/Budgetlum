import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile, FinancialGoal, IncomeSource, Budget, BudgetCategory } from "../types/user";
import { calculateMonthlyIncome } from "../utils/incomeCalculations";

interface UserStore {
  userProfile: UserProfile;
  incomes: IncomeSource[];
  budgets: Budget[];

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

  // Budget actions
  createBudget: (budget: Omit<Budget, "id" | "createdAt" | "updatedAt">) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  setActiveBudget: (id: string) => void;
  addBudgetCategory: (budgetId: string, category: Omit<BudgetCategory, "id" | "createdAt" | "updatedAt">) => void;
  updateBudgetCategory: (budgetId: string, categoryId: string, updates: Partial<BudgetCategory>) => void;
  deleteBudgetCategory: (budgetId: string, categoryId: string) => void;

  // Goals actions
  addGoal: (goal: Omit<FinancialGoal, "id">) => void;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;

  // Computed values
  getTotalIncome: (frequency?: "monthly" | "yearly") => number;
  getPrimaryIncome: () => IncomeSource | undefined;
  getActiveGoals: () => FinancialGoal[];
  getActiveBudget: () => Budget | undefined;
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
  paymentDates: [],
  budgetingPriorities: [],
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
      budgets: [],

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
          stabilityPattern: income.stabilityPattern || "consistent", // Default to consistent
          baseAmount: income.baseAmount || income.amount || 0, // Use baseAmount or fallback to amount
          isFoundational: income.isFoundational !== undefined ? income.isFoundational : true, // Default to foundational
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

      createBudget: (budget) => {
        const newBudget: Budget = {
          ...budget,
          id: generateId(),
          isActive: budget.isActive || get().budgets.length === 0, // First budget is active by default
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          budgets: [...state.budgets, newBudget],
        }));
      },

      updateBudget: (id, updates) => {
        set((state) => ({
          budgets: state.budgets.map((budget) =>
            budget.id === id
              ? { ...budget, ...updates, updatedAt: new Date().toISOString() }
              : budget
          ),
        }));
      },

      deleteBudget: (id) => {
        const { budgets } = get();
        const deletingActive = budgets.find(b => b.id === id)?.isActive;

        set((state) => {
          const newBudgets = state.budgets.filter((budget) => budget.id !== id);

          // If we deleted the active budget, make the first remaining one active
          if (deletingActive && newBudgets.length > 0) {
            newBudgets[0].isActive = true;
          }

          return { budgets: newBudgets };
        });
      },

      setActiveBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.map((budget) => ({
            ...budget,
            isActive: budget.id === id,
            updatedAt: budget.id === id ? new Date().toISOString() : budget.updatedAt,
          })),
        }));
      },

      addBudgetCategory: (budgetId, category) => {
        const newCategory: BudgetCategory = {
          ...category,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          budgets: state.budgets.map((budget) =>
            budget.id === budgetId
              ? {
                  ...budget,
                  categories: [...budget.categories, newCategory],
                  totalLimit: budget.totalLimit + newCategory.limit,
                  updatedAt: new Date().toISOString(),
                }
              : budget
          ),
        }));
      },

      updateBudgetCategory: (budgetId, categoryId, updates) => {
        set((state) => ({
          budgets: state.budgets.map((budget) => {
            if (budget.id !== budgetId) return budget;

            const oldCategory = budget.categories.find(c => c.id === categoryId);
            const oldLimit = oldCategory?.limit || 0;
            const newLimit = updates.limit !== undefined ? updates.limit : oldLimit;
            const limitDifference = newLimit - oldLimit;

            return {
              ...budget,
              categories: budget.categories.map((category) =>
                category.id === categoryId
                  ? { ...category, ...updates, updatedAt: new Date().toISOString() }
                  : category
              ),
              totalLimit: budget.totalLimit + limitDifference,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteBudgetCategory: (budgetId, categoryId) => {
        set((state) => ({
          budgets: state.budgets.map((budget) => {
            if (budget.id !== budgetId) return budget;

            const categoryToDelete = budget.categories.find(c => c.id === categoryId);
            const limitToSubtract = categoryToDelete?.limit || 0;

            return {
              ...budget,
              categories: budget.categories.filter((category) => category.id !== categoryId),
              totalLimit: budget.totalLimit - limitToSubtract,
              updatedAt: new Date().toISOString(),
            };
          }),
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

      getActiveBudget: () => {
        return get().budgets.find(budget => budget.isActive);
      },

      isOnboardingComplete: () => {
        return get().userProfile.isOnboardingComplete;
      },

      resetUserData: async () => {
        set({
          userProfile: createDefaultProfile(),
          incomes: [],
          budgets: [],
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
        budgets: state.budgets,
      }),
    }
  )
);
