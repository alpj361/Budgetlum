import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense, Budget, EXPENSE_CATEGORIES } from "../types/expense";

interface ExpenseStore {
  expenses: Expense[];
  budgets: Budget[];
  
  // Expense actions
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  // Budget actions
  setBudget: (category: string, limit: number, period: "monthly" | "weekly" | "yearly") => void;
  updateBudgetSpent: () => void;

  // Maintenance
  resetAll: () => Promise<void>;
  
  // Computed values
  getTotalSpent: (period?: "month" | "week" | "year") => number;
  getSpentByCategory: (category: string, period?: "month" | "week" | "year") => number;
  getCategoryInsights: () => Array<{
    category: string;
    totalSpent: number;
    percentage: number;
    color: string;
  }>;
}

const categoryColors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6b7280"
];

const STORAGE_KEY = "expense-store";

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
      expenses: [],
      budgets: [],

      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        };
        set((state) => ({
          expenses: [newExpense, ...state.expenses],
        }));
        get().updateBudgetSpent();
      },

      updateExpense: (id, updatedExpense) => {
        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === id ? { ...expense, ...updatedExpense } : expense
          ),
        }));
        get().updateBudgetSpent();
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));
        get().updateBudgetSpent();
      },

      setBudget: (category, limit, period) => {
        set((state) => {
          const existingBudgetIndex = state.budgets.findIndex(
            (budget) => budget.category === category
          );
          
          const newBudget: Budget = {
            category,
            limit,
            period,
            spent: get().getSpentByCategory(category, period === "monthly" ? "month" : period === "weekly" ? "week" : "year"),
          };

          if (existingBudgetIndex >= 0) {
            const updatedBudgets = [...state.budgets];
            updatedBudgets[existingBudgetIndex] = newBudget;
            return { budgets: updatedBudgets };
          } else {
            return { budgets: [...state.budgets, newBudget] };
          }
        });
      },

      updateBudgetSpent: () => {
        set((state) => ({
          budgets: state.budgets.map((budget) => ({
            ...budget,
            spent: get().getSpentByCategory(
              budget.category,
              budget.period === "monthly" ? "month" : budget.period === "weekly" ? "week" : "year"
            ),
          })),
        }));
      },

      resetAll: async () => {
        set({ expenses: [], budgets: [] });
        await AsyncStorage.removeItem(STORAGE_KEY);
      },

      getTotalSpent: (period = "month") => {
        const { expenses } = get();
        const now = new Date();
        
        return expenses
          .filter((expense) => {
            const expenseDate = new Date(expense.date);
            if (period === "month") {
              return (
                expenseDate.getMonth() === now.getMonth() &&
                expenseDate.getFullYear() === now.getFullYear()
              );
            } else if (period === "week") {
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              return expenseDate >= weekStart;
            } else if (period === "year") {
              return expenseDate.getFullYear() === now.getFullYear();
            }
            return true;
          })
          .reduce((total, expense) => total + expense.amount, 0);
      },

      getSpentByCategory: (category, period = "month") => {
        const { expenses } = get();
        const now = new Date();
        
        return expenses
          .filter((expense) => {
            const expenseDate = new Date(expense.date);
            const matchesCategory = expense.category === category;
            
            if (!matchesCategory) return false;
            
            if (period === "month") {
              return (
                expenseDate.getMonth() === now.getMonth() &&
                expenseDate.getFullYear() === now.getFullYear()
              );
            } else if (period === "week") {
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              return expenseDate >= weekStart;
            } else if (period === "year") {
              return expenseDate.getFullYear() === now.getFullYear();
            }
            return true;
          })
          .reduce((total, expense) => total + expense.amount, 0);
      },

      getCategoryInsights: () => {
        const totalSpent = get().getTotalSpent();
        
        if (totalSpent === 0) return [];
        
        const categoryTotals = EXPENSE_CATEGORIES.map((category, index) => {
          const spent = get().getSpentByCategory(category);
          return {
            category,
            totalSpent: spent,
            percentage: (spent / totalSpent) * 100,
            color: categoryColors[index % categoryColors.length],
          };
        }).filter((item) => item.totalSpent > 0);
        
        return categoryTotals.sort((a, b) => b.totalSpent - a.totalSpent);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: async (_persistedState, _version) => {
        // Migration v3: reshape categories to Spanish taxonomy; safest is to clear old data
        return { expenses: [], budgets: [] } as any;
      },
      partialize: (state) => ({
        expenses: state.expenses,
        budgets: state.budgets,
      }),
    }
  )
);
