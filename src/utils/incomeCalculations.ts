import { IncomeSource, PaymentCycle, IncomeRange } from "../types/user";

export const calculateMonthlyIncome = (income: IncomeSource): number => {
  // For stability-based calculations, use baseAmount if available
  if (income.baseAmount && income.stabilityPattern) {
    return calculateSimpleMonthlyIncome(income.baseAmount, income.frequency);
  }

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

export const calculateConservativeBaseAmount = (
  range: IncomeRange,
  stabilityPattern: "seasonal" | "variable"
): number => {
  if (stabilityPattern === "seasonal") {
    // For seasonal income, use a weighted average favoring the low end
    return (range.lowest * 0.6) + (range.highest * 0.4);
  } else {
    // For variable income, use the lowest amount for maximum safety
    return range.lowest;
  }
};

export const validateIncomeRange = (range: IncomeRange): string[] => {
  const errors: string[] = [];

  if (!range.lowest || range.lowest <= 0) {
    errors.push("Debe ingresar su monto más bajo.");
  }

  if (!range.highest || range.highest <= 0) {
    errors.push("Debe ingresar su monto más alto.");
  }

  if (range.lowest > 0 && range.highest > 0 && range.highest <= range.lowest) {
    errors.push("El monto más alto debe ser mayor al monto más bajo.");
  }

  return errors;
};

export const getStabilityGuidanceText = (stabilityPattern: string): string => {
  const guidance = {
    consistent: "Tu ingreso constante permitirá crear un presupuesto muy predecible.",
    seasonal: "Presupuestaremos con un monto conservador para cubrir las temporadas bajas.",
    variable: "Usaremos un enfoque conservador basado en tus ingresos más bajos.",
  };

  return guidance[stabilityPattern as keyof typeof guidance] || "";
};

export const createIncomeSourceFromStability = (
  name: string,
  frequency: string,
  stabilityPattern: "consistent" | "seasonal" | "variable",
  amount?: number,
  range?: IncomeRange
): Partial<IncomeSource> => {
  const baseData = {
    name: name.trim(),
    frequency: frequency as any,
    stabilityPattern,
    isActive: true,
    isPrimary: true,
    isFoundational: true,
    paymentPattern: "simple" as const,
  };

  if (stabilityPattern === "consistent") {
    return {
      ...baseData,
      amount: amount || 0,
      baseAmount: amount || 0,
    };
  }

  if (stabilityPattern === "seasonal" || stabilityPattern === "variable") {
    const conservativeAmount = range ? calculateConservativeBaseAmount(range, stabilityPattern) : 0;
    return {
      ...baseData,
      amount: conservativeAmount,
      baseAmount: conservativeAmount,
      incomeRange: range,
    };
  }

  return baseData;
};