export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring?: boolean;
  receiptImage?: string;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  period: "monthly" | "weekly" | "yearly";
}

export interface CategoryInsight {
  category: string;
  totalSpent: number;
  percentage: number;
  color: string;
}

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Groceries",
  "Other"
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];