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

export interface PaymentCycle {
  id: string;
  amount: number;
  weekOfMonth?: number; // For weekly patterns (1-4)
  dayOfMonth?: number;  // For monthly patterns (1-31)
  description?: string; // "First two weeks", "Last payment", etc.
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number; // Base amount (for simple mode) or total estimated monthly
  frequency: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "irregular";
  nextPayDate?: string;
  isActive: boolean;
  isPrimary: boolean;
  description?: string;
  // Enhanced payment cycle support
  paymentPattern: "simple" | "complex";
  cycles?: PaymentCycle[]; // For complex patterns
}

export type OnboardingStep =
  | "welcome"
  | "personal_info"
  | "income_setup"
  | "expense_profile"
  | "goals"
  | "budget_preferences"
  | "complete";