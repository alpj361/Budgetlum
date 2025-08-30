import { TOP_CATEGORY_LABELS } from "./categories";

export interface Expense {
  id: string;
  amount: number;
  description: string;
  // Display label (Spanish). Kept for backward compatibility.
  category: string;
  // New taxonomy IDs
  categoryId?: string;
  subcategoryId?: string;
  date: string;
  isRecurring?: boolean;
  receiptImage?: string;
}

export interface Budget {
  // Display label for now; taxonomy IDs can be added later
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

// Spanish top-level categories for selection and insights
export const EXPENSE_CATEGORIES: string[] = TOP_CATEGORY_LABELS;

export type ExpenseCategory = string;