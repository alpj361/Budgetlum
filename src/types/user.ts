export interface UserProfile {
  // Basic info
  name: string;
  nickname?: string;

  // Life stage and preferences
  lifeStage: "student" | "young_professional" | "family" | "established" | "retirement" | "";
  budgetingExperience: "beginner" | "intermediate" | "advanced" | "";

  // Financial setup
  primaryIncome?: number;
  payFrequency?: "weekly" | "bi-weekly" | "monthly" | "irregular";

  // Goals and priorities
  financialGoals: FinancialGoal[];
  spendingStyle: "conservative" | "moderate" | "flexible" | "";

  // Onboarding tracking
  isOnboardingComplete: boolean;
  onboardingVersion: number;
  onboardingStep: number;

  // Preferences
  preferredBudgetPeriod: "monthly" | "bi-monthly" | "quarterly" | "";
  enableBussyGuidance: boolean;
  paymentDates?: number[];
  budgetingPriorities?: string[];

  // Central America features
  country?: string; // Country code (MX, GT, etc.)
  hasSetupIncome?: boolean;
  incomeSetupPath?: "simple" | "advanced";

  // Budget features
  hasSetupBudget?: boolean;
  budgetSetupMethod?: "ui" | "ai" | "skip";

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  priority: "high" | "medium" | "low";
  type: "emergency_fund" | "debt_payoff" | "savings" | "investment" | "purchase" | "other";
  isActive: boolean;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number;
  priority: "essential" | "important" | "optional";
  icon?: string;
  reasoning?: string;
  isActive: boolean;
  period: "monthly" | "bi-weekly" | "weekly";
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  name: string;
  categories: BudgetCategory[];
  totalLimit: number;
  totalSpent: number;
  period: "monthly" | "bi-weekly" | "weekly";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCycle {
  id: string;
  amount: number;
  weekOfMonth?: number; // For weekly patterns (1-4)
  dayOfMonth?: number;  // For monthly patterns (1-31)
  description?: string; // "First two weeks", "Last payment", etc.
}

export interface IncomeRange {
  lowest: number;
  highest: number;
  averageLow: number; // For conservative budgeting
}

export interface PaymentStructure {
  type: "monthly" | "bi-monthly" | "bi-weekly" | "weekly" | "quarterly" | "irregular";
  paymentsPerPeriod: number;
  period: "month" | "year";
  description: string; // Human readable description
}

export interface PaymentSchedule {
  type: "fixed-dates" | "day-pattern" | "custom";
  dates?: number[]; // Days of month (1-31)
  pattern?: "first-friday" | "last-friday" | "every-friday" | "bi-weekly-friday";
  startDate?: Date;
  description: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  type?: "salary" | "freelance" | "business" | "rental" | "remittance" | "other";
  amount: number; // Base amount (for simple mode) or total estimated monthly
  frequency: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly" | "irregular" | "project" | "seasonal" | "daily"; // Enhanced with new types
  paymentStructure?: PaymentStructure; // New structured approach
  paymentSchedule?: PaymentSchedule; // Specific payment dates/patterns
  nextPayDate?: string;
  isActive: boolean;
  isPrimary: boolean;
  description?: string;
  // Enhanced payment cycle support
  paymentPattern?: "simple" | "complex";
  cycles?: PaymentCycle[]; // For complex patterns
  // Income stability analysis
  stabilityPattern?: "consistent" | "seasonal" | "variable";
  incomeRange?: IncomeRange; // For variable income
  baseAmount?: number; // Conservative amount for budgeting
  isFoundational?: boolean; // Primary reliable income for budget base
  // Central America features
  country?: string;
  payDate?: number; // Day of month for simple payment schedules
  takesHomePay?: boolean; // Whether amount is after taxes
  bonuses?: any[]; // Country-specific bonuses
  annualBonusTotal?: number;
  // Variable income support
  minAmount?: number;
  maxAmount?: number;
  isVariable?: boolean;
}

export type OnboardingStep =
  | "welcome"
  | "personal_info"
  | "income_setup"
  | "expense_profile"
  | "goals"
  | "budget_preferences"
  | "complete";
