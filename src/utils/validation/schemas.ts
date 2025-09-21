export interface IncomeValidationInput {
  amount?: number | null;
  frequency?: string | null;
  type?: string | null;
  paymentDates?: number[] | null;
  description?: string | null;
}

export interface PreferencesValidationInput {
  budgetingStyle?: string | null;
  savingsGoal?: number | null;
  paymentDates?: number[] | null;
  priorities?: string[] | null;
}

const VALID_INCOME_FREQUENCIES = [
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "yearly",
  "irregular",
  "project",
  "seasonal",
];

const VALID_INCOME_TYPES = [
  "salary",
  "freelance",
  "business",
  "rental",
  "remittance",
  "other",
];

const VALID_BUDGETING_STYLES = ["strict", "flexible", "balanced"];

export const validateIncomeInput = (income: IncomeValidationInput): string[] => {
  const errors: string[] = [];

  if (income.amount !== null && income.amount !== undefined) {
    if (Number.isNaN(income.amount)) {
      errors.push("El monto debe ser numérico");
    } else if (income.amount < 0) {
      errors.push("El monto no puede ser negativo");
    }
  }

  if (income.frequency && !VALID_INCOME_FREQUENCIES.includes(income.frequency)) {
    errors.push("Frecuencia inválida, usa semanal/quincenal/mensual/etc.");
  }

  if (income.type && !VALID_INCOME_TYPES.includes(income.type)) {
    errors.push("Tipo de ingreso inválido");
  }

  if (income.paymentDates && income.paymentDates.length > 0) {
    income.paymentDates.forEach((date) => {
      if (typeof date !== "number" || !Number.isInteger(date)) {
        errors.push("Las fechas de pago deben ser números enteros");
      } else if (date < 1 || date > 31) {
        errors.push("Las fechas de pago deben estar entre 1 y 31");
      }
    });
  }

  if (income.description && income.description.length > 140) {
    errors.push("La descripción del ingreso debe ser corta (máximo 140 caracteres)");
  }

  return Array.from(new Set(errors));
};

export const validatePreferencesInput = (preferences: PreferencesValidationInput | undefined): string[] => {
  if (!preferences) return [];
  const errors: string[] = [];

  if (preferences.savingsGoal !== undefined && preferences.savingsGoal !== null) {
    if (Number.isNaN(preferences.savingsGoal)) {
      errors.push("El ahorro debe ser un número");
    } else if (preferences.savingsGoal < 0) {
      errors.push("El ahorro no puede ser negativo");
    }
  }

  if (preferences.budgetingStyle && !VALID_BUDGETING_STYLES.includes(preferences.budgetingStyle)) {
    errors.push("Estilo de presupuesto inválido");
  }

  if (preferences.paymentDates && preferences.paymentDates.length > 0) {
    preferences.paymentDates.forEach((date) => {
      if (typeof date !== "number" || !Number.isInteger(date)) {
        errors.push("Las fechas de pago deben ser números enteros");
      } else if (date < 1 || date > 31) {
        errors.push("Las fechas de pago deben estar entre 1 y 31");
      }
    });
  }

  return Array.from(new Set(errors));
};
