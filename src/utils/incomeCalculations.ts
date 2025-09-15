import { IncomeSource, PaymentCycle } from "../types/user";

export const calculateMonthlyIncome = (income: IncomeSource): number => {
  // For simple patterns, use the base amount with frequency multiplier
  if (income.paymentPattern === "simple" || !income.cycles?.length) {
    return calculateSimpleMonthlyIncome(income.amount, income.frequency);
  }

  // For complex patterns, calculate based on cycles
  const cycleTotal = income.cycles.reduce((sum, cycle) => sum + cycle.amount, 0);

  switch (income.frequency) {
    case "weekly":
      // Assume the cycle total represents all payments in a 4-week cycle
      return cycleTotal * (52 / 12) / 4; // More accurate weekly to monthly
    case "bi-weekly":
      // Cycle total represents both bi-weekly payments in a month
      return cycleTotal * (26 / 12) / 2; // More accurate bi-weekly to monthly
    case "monthly":
      // Cycle total is the monthly total
      return cycleTotal;
    case "quarterly":
      // Cycle total represents quarterly payments
      return cycleTotal / 3;
    case "irregular":
      // Use cycle total as monthly estimate
      return cycleTotal;
    default:
      return cycleTotal;
  }
};

export const calculateSimpleMonthlyIncome = (amount: number, frequency: string): number => {
  switch (frequency) {
    case "weekly":
      return amount * 4.33; // 52 weeks / 12 months
    case "bi-weekly":
      return amount * 2.17; // 26 pay periods / 12 months
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "irregular":
      return amount;
    default:
      return 0;
  }
};

export const calculateAnnualIncome = (income: IncomeSource): number => {
  return calculateMonthlyIncome(income) * 12;
};

export const getPaymentFrequencyDisplay = (frequency: string): string => {
  const displays: Record<string, string> = {
    weekly: "semanal",
    "bi-weekly": "quincenal",
    monthly: "mensual",
    quarterly: "trimestral",
    irregular: "irregular",
  };
  return displays[frequency] || frequency;
};

export const validatePaymentCycles = (cycles: PaymentCycle[], frequency: string): string[] => {
  const errors: string[] = [];

  if (!cycles.length) {
    errors.push("Debe configurar al menos un pago.");
    return errors;
  }

  const maxCycles = getMaxCyclesForFrequency(frequency);
  if (cycles.length > maxCycles) {
    errors.push(`Solo puede tener ${maxCycles} pagos para frecuencia ${getPaymentFrequencyDisplay(frequency)}.`);
  }

  cycles.forEach((cycle, index) => {
    if (!cycle.amount || cycle.amount <= 0) {
      errors.push(`El pago ${index + 1} debe tener un monto válido.`);
    }

    if (!cycle.description?.trim()) {
      errors.push(`El pago ${index + 1} debe tener una descripción.`);
    }
  });

  return errors;
};

export const getMaxCyclesForFrequency = (frequency: string): number => {
  switch (frequency) {
    case "weekly":
      return 4;
    case "bi-weekly":
      return 2;
    case "monthly":
      return 4;
    case "quarterly":
      return 3;
    case "irregular":
      return 6;
    default:
      return 4;
  }
};

export const createDefaultCycles = (frequency: string, baseAmount: number): PaymentCycle[] => {
  const id = () => `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  switch (frequency) {
    case "weekly":
      return [
        { id: id(), amount: baseAmount, description: "Semana 1" },
        { id: id(), amount: baseAmount, description: "Semana 2" },
        { id: id(), amount: baseAmount, description: "Semana 3" },
        { id: id(), amount: baseAmount, description: "Semana 4" },
      ];
    case "bi-weekly":
      return [
        { id: id(), amount: baseAmount, description: "Primera quincena" },
        { id: id(), amount: baseAmount, description: "Segunda quincena" },
      ];
    case "monthly":
      return [
        { id: id(), amount: baseAmount, description: "Pago mensual" },
      ];
    default:
      return [
        { id: id(), amount: baseAmount, description: "Pago 1" },
      ];
  }
};

export const getIncomePreviewText = (income: IncomeSource): string => {
  const monthlyAmount = calculateMonthlyIncome(income);
  const pattern = income.paymentPattern === "complex" && income.cycles?.length ? "variable" : "fijo";

  return `${getPaymentFrequencyDisplay(income.frequency)} ${pattern} → $${monthlyAmount.toLocaleString()}/mes`;
};