import { ExtractedData } from "./smartExtractionService";
import { IncomeSource, UserProfile } from "../types/user";
import { ParsedIncome } from "../utils/incomeParser";

interface UserStoreSnapshot {
  incomes: IncomeSource[];
  userProfile: UserProfile;
  addIncome: (income: Omit<IncomeSource, "id">) => void;
  updateIncome: (id: string, updates: Partial<IncomeSource>) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addGoal: (goal: {
    title: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    priority: "high" | "medium" | "low";
    type: "emergency_fund" | "debt_payoff" | "savings" | "investment" | "purchase" | "other";
    isActive: boolean;
  }) => void;
}

interface SyncReport {
  incomesUpdated: number;
  incomesCreated: number;
  goalsCreated: number;
  profileUpdated: boolean;
}

const FREQUENCY_MAP: Record<string, IncomeSource["frequency"]> = {
  weekly: "weekly",
  "bi-weekly": "bi-weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
  irregular: "irregular",
  project: "project",
  seasonal: "seasonal",
  daily: "daily",
};

export class DataSyncService {
  static syncExtractedData(extracted: ExtractedData, store: UserStoreSnapshot): SyncReport {
    let incomesUpdated = 0;
    let incomesCreated = 0;
    let goalsCreated = 0;
    let profileUpdated = false;

    // Sync incomes
    extracted.incomes.forEach((income) => {
      const resolvedAmount = resolveIncomeAmount(income);
      if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
        return;
      }

      const minAmount = Number.isFinite(income.minAmount) ? income.minAmount : undefined;
      const maxAmount = Number.isFinite(income.maxAmount) ? income.maxAmount : undefined;

      const frequency = FREQUENCY_MAP[income.frequency] || "monthly";
      const normalizedName = income.type ? income.type.charAt(0).toUpperCase() + income.type.slice(1) : "Ingreso";
      
      const existing = store.incomes.find((source) => {
        const sameFrequency = source.frequency === frequency;
        const sameType = source.type === income.type;
        const closeAmount = Math.abs((source.amount || 0) - resolvedAmount) <= Math.max(50, resolvedAmount * 0.05);
        return sameFrequency && sameType && closeAmount;
      });

      const baseAmount = income.isVariable
        ? (minAmount ?? resolvedAmount * 0.7)
        : resolvedAmount;

      if (existing) {
        store.updateIncome(existing.id, {
          amount: resolvedAmount,
          minAmount,
          maxAmount,
          isVariable: income.isVariable,
          baseAmount,
          stabilityPattern: income.isVariable ? "variable" : existing.stabilityPattern,
          paymentPattern: income.paymentDates && income.paymentDates.length > 1 ? "complex" : existing.paymentPattern,
          payDate: income.paymentDates && income.paymentDates.length === 1 ? income.paymentDates[0] : existing.payDate,
          paymentSchedule: income.paymentDates && income.paymentDates.length > 1
            ? {
                type: "fixed-dates",
                dates: income.paymentDates,
                description: income.description || existing.paymentSchedule?.description || "Generado automáticamente por Bussy",
              }
            : existing.paymentSchedule,
          description: income.description || existing.description,
        });
        incomesUpdated += 1;
      } else {
        store.addIncome({
          name: income.type ? `${normalizedName}` : "Ingreso",
          type: income.type,
          amount: resolvedAmount,
          frequency,
          isActive: true,
          isPrimary: store.incomes.length === 0,
          description: income.description,
          paymentPattern: income.paymentDates && income.paymentDates.length > 1 ? "complex" : "simple",
          paymentSchedule: income.paymentDates && income.paymentDates.length > 1
            ? {
                type: "fixed-dates",
                dates: income.paymentDates,
                description: income.description || "Generado automáticamente por Bussy",
              }
            : undefined,
          payDate: income.paymentDates && income.paymentDates.length === 1 ? income.paymentDates[0] : undefined,
          stabilityPattern: income.isVariable ? "variable" : "consistent",
          baseAmount,
          minAmount,
          maxAmount,
          isVariable: income.isVariable,
          isFoundational: income.confidence > 0.6,
        });
        incomesCreated += 1;
      }
    });

    // Sync goals
    extracted.goals.forEach((goal) => {
      if (!goal.title || !goal.targetAmount) return;

      const alreadyExists = store.userProfile.financialGoals.some((existing) => {
        return existing.title.toLowerCase() === goal.title!.toLowerCase();
      });

      if (!alreadyExists) {
        store.addGoal({
          title: goal.title,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
          priority: goal.priority || "medium",
          description: goal.description,
          type: goal.type || "savings",
          currentAmount: goal.currentAmount || 0,
          isActive: goal.isActive ?? true,
        });
        goalsCreated += 1;
      }
    });

    // Sync preferences to profile
    if (extracted.preferences) {
      const profileUpdates: Partial<UserProfile> = {};

      if (extracted.preferences.budgetingStyle) {
        profileUpdates.spendingStyle = extracted.preferences.budgetingStyle === "strict"
          ? "conservative"
          : extracted.preferences.budgetingStyle === "flexible"
            ? "flexible"
            : "moderate";
      }

      if (Array.isArray(extracted.preferences.paymentDates)) {
        profileUpdates.paymentDates = extracted.preferences.paymentDates;
      }

      if (Array.isArray(extracted.preferences.priorities)) {
        profileUpdates.budgetingPriorities = extracted.preferences.priorities;
      }

      if (Object.keys(profileUpdates).length > 0) {
        store.updateProfile(profileUpdates);
        profileUpdated = true;
      }
    }

    return {
      incomesUpdated,
      incomesCreated,
      goalsCreated,
      profileUpdated,
    };
  }
}

const resolveIncomeAmount = (income: ParsedIncome): number | undefined => {
  if (Number.isFinite(income.amount)) {
    return income.amount;
  }
  if (Number.isFinite(income.minAmount) && Number.isFinite(income.maxAmount)) {
    return ((income.minAmount as number) + (income.maxAmount as number)) / 2;
  }
  if (Number.isFinite(income.minAmount)) {
    return income.minAmount;
  }
  if (Number.isFinite(income.maxAmount)) {
    return income.maxAmount;
  }
  return undefined;
};
