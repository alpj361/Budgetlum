import { ParsedIncome } from "../utils/incomeParser";
import { FinancialGoal, BudgetCategory } from "../types/user";
import { 
  projectNextPayments, 
  projectBiWeeklyPayments, 
  projectWeeklyPayments,
  formatProjection,
  getCurrentDate 
} from "../utils/calendar/dateUtils";

export interface ExtractedData {
  incomes: ParsedIncome[];
  expenses: Array<{
    category: string;
    amount: number;
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular' | 'daily';
    description?: string;
  }>;
  goals: Partial<FinancialGoal>[];
  preferences: {
    budgetingStyle?: 'strict' | 'flexible' | 'balanced';
    savingsGoal?: number;
    priorities?: string[];
    paymentDates?: number[];
  };
  confidence: number;
}

export interface ValidationRule {
  field: string;
  condition: (value: any) => boolean;
  message: string;
  autoFix?: (value: any) => any;
}

export class SmartExtractionService {
  private static readonly EXTRACTION_PROMPT = `
Extract detailed financial data from a conversational message and reply with a JSON object only.

CRITICAL RULES - ALWAYS EXTRACT SOMETHING:
1. NEVER fail or return empty data - extract whatever is available and apply smart defaults
2. Handle incomplete information gracefully with intelligent defaults
3. Missing dates? Apply defaults: quincenal=[15,30], mensual=[1], semanal=[5], diario=[1-31]
4. Missing frequency? Default to "monthly" if amount is mentioned
5. Missing amount? Set to null but continue extraction
6. Work mentions like "Trabajo en X"? Extract company and apply salary defaults
7. Vague amounts like "como 5000", "unos 5k", "between 500-800"? Parse them
8. ALWAYS return valid JSON even with minimal data

PRINCIPLES:
- Always capture explicit amounts or ranges and convert them to a monthly baseline. If the user gives per-cycle numbers, keep the monthly total in "amount" and use payment dates to describe the cycle.
- Recognise quincena/bi-weekly, irregular, seasonal, hourly, and commission-based statements. Flag "isVariable" when part of the income fluctuates, storing any conservative/base portion in "amount" and ranges in "minAmount"/"maxAmount".
- Detect specific payment dates (15, 28, "fin de mes") and include them as integers. If the user mentions adjustments for fines de semana o feriados, capture that note in "description" (e.g. "se mueve al día hábil anterior").
- Use "description" for contextual scheduling rules, hourly assumptions, or how extra bonuses work so the assistant can adapt later.
- Identify expenses, financial goals, and preferences even when the user mixes topics or gives them out of order.
- Return confidence scores (0-1) for every element and leave fields null when the information is unavailable.
- Extract work context: "Trabajo en X" → company: "X", type: "salary", frequency: "monthly" (default)

RETURN FORMAT:
{
  "incomes": [
    {
      "name": string | null,
      "amount": number,
      "minAmount": number | null,
      "maxAmount": number | null,
      "frequency": "weekly"|"bi-weekly"|"monthly"|"quarterly"|"yearly"|"irregular"|"project"|"seasonal"|"daily",
      "type": "salary"|"freelance"|"business"|"rental"|"remittance"|"other",
      "paymentDates": [number],
      "isVariable": boolean,
      "description": string | null,
      "confidence": number
    }
  ],
  "expenses": [
    {
      "category": string,
      "amount": number,
      "frequency": "weekly"|"bi-weekly"|"monthly"|"quarterly"|"yearly"|"irregular",
      "description": string | null,
      "confidence": number
    }
  ],
  "goals": [{"title": string, "targetAmount": number, "targetDate": string | null, "confidence": number}],
  "preferences": {
    "budgetingStyle": "strict"|"flexible"|"balanced" | null,
    "savingsGoal": number | null,
    "paymentDates": [number],
    "priorities": [string]
  },
  "confidence": number,
  "needsClarification": [{"field": string, "question": string}],
  "isComplete": boolean
}

Examples:
- "Gano Q4,500 divididos el 17 y 28 de cada mes, si cae en domingo lo pagan el viernes" → income amount 4500, frequency "bi-weekly", paymentDates [17, 28], description "ajusta a día hábil anterior".
- "Recibo Q1,200 de comisiones (mínimo Q800)" → amount 800, minAmount 800, maxAmount 1200, isVariable true.
- "Pago la renta el 1 y la tarjeta el 15" → preferences.paymentDates [1, 15].
- "Me pagan por hora (Q25) y suelo trabajar 40 horas" → amount 25*160, isVariable true, description "basado en 40h".
- "Trabajo en Google" → income type "salary", frequency "monthly", paymentDates [1], company "Google", amount null, confidence 0.4.
- "Gano como 5000 al mes" → amount 5000, frequency "monthly", paymentDates [1], confidence 0.7.
- "Entre 500-800 semanales de propinas" → minAmount 500, maxAmount 800, amount 650, frequency "weekly", isVariable true, type "other".
- "Soy freelance de diseño" → type "freelance", frequency "project", amount null, description "diseño", confidence 0.3.
- "Quincenal en la tienda" → frequency "bi-weekly", paymentDates [15, 30], type "salary", amount null, company "tienda".
`;

  static async extractFromMessage(message: string, context: any = {}): Promise<ExtractedData> {
    try {
      const { getOpenAITextResponse } = await import('../api/chat-service');

      const extractionPrompt = `
${this.EXTRACTION_PROMPT}

CONTEXT: ${JSON.stringify(context)}
USER MESSAGE: "${message}"

Return only valid JSON:`;

      const response = await getOpenAITextResponse([
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: message }
      ], {
        temperature: 0.1, // Low temperature for consistent extraction
        maxTokens: 1000
      });

      // Try to parse JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const extracted = JSON.parse(jsonMatch[0]);

      const incomes: ParsedIncome[] = (extracted.incomes || []).map((income: any) => {
        const amount = typeof income.amount === 'string' ? parseFloat(income.amount.replace(/[^\d.-]/g, '')) : income.amount;
        const minAmount = typeof income.minAmount === 'string' ? parseFloat(income.minAmount.replace(/[^\d.-]/g, '')) : income.minAmount;
        const maxAmount = typeof income.maxAmount === 'string' ? parseFloat(income.maxAmount.replace(/[^\d.-]/g, '')) : income.maxAmount;
        const rawFrequency = typeof income.frequency === 'string' ? income.frequency.toLowerCase() : undefined;
        const normalizedFrequency = rawFrequency ? rawFrequency.replace(/\s+/g, '-') : undefined;
        const frequency = (() => {
          switch (normalizedFrequency) {
            case 'biweekly':
            case 'bi-semanal':
            case 'quincenal':
            case 'cada-15':
              return 'bi-weekly';
            case 'mensual':
              return 'monthly';
            case 'semanal':
              return 'weekly';
            case 'anual':
              return 'yearly';
            case 'trimestral':
              return 'quarterly';
            case 'diario':
            case 'diaria':
              return 'daily';
            default:
              return normalizedFrequency as ParsedIncome['frequency'] | undefined;
          }
        })();
        const rawType = typeof income.type === 'string' ? income.type.toLowerCase() : undefined;
        const type = (() => {
          switch (rawType) {
            case 'salary':
            case 'salario':
            case 'empleo':
            case 'job':
              return 'salary';
            case 'freelance':
            case 'independiente':
            case 'consultoria':
            case 'consultoría':
              return 'freelance';
            case 'business':
            case 'negocio':
            case 'empresa':
              return 'business';
            case 'renta':
            case 'alquiler':
            case 'rental':
              return 'rental';
            case 'remesa':
            case 'remesas':
            case 'remittance':
              return 'remittance';
            default:
              return rawType as ParsedIncome['type'] | undefined;
          }
        })();
        const fallbackAmountCandidate = Number.isFinite(amount)
          ? amount
          : Number.isFinite(minAmount)
            ? minAmount
            : Number.isFinite(maxAmount)
              ? maxAmount
              : undefined;
        const normalizedAmount =
          typeof fallbackAmountCandidate === 'number' && Number.isFinite(fallbackAmountCandidate)
            ? fallbackAmountCandidate
            : undefined;

        // Apply intelligent defaults for payment dates based on frequency
        let paymentDates = Array.isArray(income.paymentDates)
          ? income.paymentDates
              .map(normalizePaymentDateValue)
              .filter((value): value is number => typeof value === 'number')
          : undefined;

        // If no payment dates but we have frequency, apply smart defaults
        if (!paymentDates || paymentDates.length === 0) {
          paymentDates = inferPaymentDatesFromFrequency(frequency || income.frequency);
        }

        // Extract company name from description or context
        const company = income.company || extractCompanyFromText(income.description || '');

        // Generate smart name if missing
        const name = income.name || generateIncomeName(type || income.type, company, income.description);

        return {
          ...income,
          name,
          amount: normalizedAmount ?? income.amount,
          minAmount: Number.isFinite(minAmount) ? minAmount : income.minAmount,
          maxAmount: Number.isFinite(maxAmount) ? maxAmount : income.maxAmount,
          frequency: (frequency as ParsedIncome['frequency']) || income.frequency || 'monthly', // Default to monthly
          type: type || income.type,
          paymentDates,
          description: typeof income.description === 'string' ? income.description.trim() : income.description,
        } as ParsedIncome;
      });

      const preferences = extracted.preferences || {};
      if (Array.isArray(preferences.paymentDates)) {
        preferences.paymentDates = preferences.paymentDates
          .map(normalizePaymentDateValue)
          .filter((value): value is number => typeof value === 'number');
      }
      if (typeof preferences.savingsGoal === 'string') {
        const parsed = parseFloat(preferences.savingsGoal.replace(/[^\d.-]/g, ''));
        preferences.savingsGoal = Number.isFinite(parsed) ? parsed : preferences.savingsGoal;
      }
      if (Array.isArray(preferences.priorities)) {
        preferences.priorities = preferences.priorities
          .map((value: any) => (typeof value === 'string' ? value : String(value)))
          .filter(Boolean);
      }

      return {
        incomes,
        expenses: extracted.expenses || [],
        goals: extracted.goals || [],
        preferences,
        confidence: extracted.confidence || 0.5
      };

    } catch (error) {
      console.error('Extraction error:', error);
      return {
        incomes: [],
        expenses: [],
        goals: [],
        preferences: {},
        confidence: 0
      };
    }
  }

  static validateExtraction(data: ExtractedData): { isValid: boolean; errors: string[]; suggestions: string[] } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Income validation
    const allowedFrequencies = [
      'weekly',
      'bi-weekly',
      'monthly',
      'quarterly',
      'yearly',
      'irregular',
      'project',
      'seasonal',
      'daily'
    ];

    data.incomes.forEach((income, index) => {
      const resolvedAmount = resolveAmountForValidation(income);
      if (!resolvedAmount || resolvedAmount <= 0) {
        suggestions.push(`Ingreso ${index + 1}: confirmemos el monto mensual o rango conservador.`);
      } else if (resolvedAmount > 1_000_000) {
        suggestions.push(`¿El ingreso de $${resolvedAmount.toLocaleString()} es correcto?`);
      }

      if (income.paymentDates) {
        income.paymentDates.forEach((date) => {
          if (date < 1 || date > 31) {
            errors.push(`Ingreso ${index + 1}: la fecha de pago ${date} no es válida (usa 1-31).`);
          }
        });
      }

      if (income.frequency && !allowedFrequencies.includes(income.frequency as any)) {
        suggestions.push(`Ingreso ${index + 1}: frecuencia "${income.frequency}" poco común, valida si corresponde.`);
      }

      if (income.isVariable && !Number.isFinite(income.minAmount) && !Number.isFinite(income.amount)) {
        suggestions.push(`Ingreso ${index + 1}: indica un monto base fijo para usar en el presupuesto.`);
      }
    });

    // Goals validation
    data.goals.forEach((goal, index) => {
      if (goal.targetAmount && goal.targetAmount <= 0) {
        errors.push(`Meta ${index + 1}: El monto objetivo debe ser positivo`);
      }
      if (goal.targetDate) {
        const targetDate = new Date(goal.targetDate);
        const now = new Date();
        if (targetDate <= now) {
          suggestions.push(`¿La fecha objetivo de "${goal.title}" es en el pasado?`);
        }
      }
    });

    // Payment dates validation
    if (data.preferences.paymentDates) {
      data.preferences.paymentDates.forEach(date => {
        if (date < 1 || date > 31) {
          errors.push(`Fecha de pago inválida: ${date}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  static generateConfirmationPrompt(data: ExtractedData, userCountry: string = 'GT'): string {
    const parts: string[] = [];

    if (data.incomes.length > 0) {
      parts.push(`**Ingresos detectados:**`);
      data.incomes.forEach(income => {
        const amount = income.amount || income.minAmount || income.maxAmount;
        const freqText = this.getFrequencyText(income.frequency);
        
        parts.push(`• ${income.type || 'ingreso'}: Q${amount?.toLocaleString()} (${freqText})`);
        
        // Add payment date projections
        if (income.paymentDates && income.paymentDates.length > 0) {
          const projections = this.projectIncomePayments(income, userCountry);
          if (projections.length > 0) {
            parts.push(`  Distribución estimada: ${projections.length} pago(s) de aproximadamente Q${Math.round(amount! / projections.length).toLocaleString()}`);
            parts.push(`  Próximos pagos: ${projections.map(p => formatProjection(p)).join(', ')}`);
          }
        }
        
        // Add variable income info
        if (income.isVariable && income.minAmount && income.maxAmount) {
          parts.push(`  Base conservadora: Q${income.minAmount.toLocaleString()}`);
        }
        
        // Add notes
        if (income.description) {
          parts.push(`  Nota: ${income.description}`);
        }
      });
    }

    if (data.expenses.length > 0) {
      parts.push(`**Gastos detectados:**`);
      data.expenses.forEach(expense => {
        parts.push(`• $${expense.amount.toLocaleString()} ${expense.frequency} en ${expense.category}`);
      });
    }

    if (data.goals.length > 0) {
      parts.push(`**Metas detectadas:**`);
      data.goals.forEach(goal => {
        parts.push(`• ${goal.title}: $${goal.targetAmount?.toLocaleString()} para ${goal.targetDate}`);
      });
    }

    if (data.preferences.paymentDates && data.preferences.paymentDates.length > 0) {
      parts.push(`**Fechas de pago:** ${data.preferences.paymentDates.join(', ')}`);
    }

    if (data.preferences.budgetingStyle) {
      parts.push(`**Estilo de presupuesto:** ${data.preferences.budgetingStyle}`);
    }

    return parts.join('\n');
  }

  /**
   * Project payment dates for an income source
   */
  private static projectIncomePayments(
    income: ParsedIncome,
    userCountry: string
  ): any[] {
    if (!income.paymentDates || income.paymentDates.length === 0) {
      return [];
    }

    const frequency = income.frequency.toLowerCase();
    
    try {
      if (frequency === 'bi-weekly' || frequency === 'quincenal') {
        return projectBiWeeklyPayments(income.paymentDates, userCountry, 6, true);
      } else if (frequency === 'monthly' || frequency === 'mensual') {
        return projectNextPayments(income.paymentDates[0], userCountry, 3, true);
      } else if (frequency === 'weekly' || frequency === 'semanal') {
        return projectWeeklyPayments(income.paymentDates[0] || 5, userCountry, 4, true);
      }
    } catch (error) {
      console.error('Error projecting payments:', error);
    }
    
    return [];
  }

  /**
   * Get frequency text in Spanish
   */
  private static getFrequencyText(frequency: string): string {
    const map: Record<string, string> = {
      'weekly': 'semanal',
      'bi-weekly': 'quincenal',
      'monthly': 'mensual',
      'quarterly': 'trimestral',
      'yearly': 'anual',
      'daily': 'diario',
      'project': 'por proyecto',
      'seasonal': 'temporal',
      'irregular': 'irregular',
    };
    return map[frequency] || frequency;
  }
}

const resolveAmountForValidation = (income: ParsedIncome): number | undefined => {
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

/**
 * Infer payment dates based on frequency pattern
 */
const inferPaymentDatesFromFrequency = (frequency?: string): number[] | undefined => {
  if (!frequency) return undefined;

  const freq = frequency.toLowerCase();
  
  // Default payment dates by frequency
  const defaultDates: Record<string, number[]> = {
    'bi-weekly': [15, 30],
    'quincenal': [15, 30],
    'monthly': [1],
    'mensual': [1],
    'weekly': [5], // Friday
    'semanal': [5],
    'daily': undefined as any, // No specific dates for daily
    'diario': undefined as any,
    'quarterly': [1],
    'trimestral': [1],
    'yearly': [1],
    'anual': [1],
  };

  return defaultDates[freq];
};

/**
 * Extract company name from text
 */
const extractCompanyFromText = (text: string): string | undefined => {
  if (!text) return undefined;

  const lowerText = text.toLowerCase();

  // Patterns: "trabajo en X", "empleado en X", "work at X"
  const patterns = [
    /(?:trabajo|empleado|work|empleo)\s+(?:en|at)\s+([a-záéíóúñ\w\s]+?)(?:\.|,|$)/i,
    /(?:empresa|company|tienda|negocio)\s+([a-záéíóúñ\w\s]+?)(?:\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
};

/**
 * Generate intelligent income name based on available data
 */
const generateIncomeName = (
  type?: string, 
  company?: string, 
  description?: string
): string => {
  // Priority 1: Use company name
  if (company) {
    return `Trabajo en ${company}`;
  }

  // Priority 2: Use type
  const typeNames: Record<string, string> = {
    salary: 'Salario',
    freelance: 'Trabajo Freelance',
    business: 'Negocio Propio',
    rental: 'Ingresos por Renta',
    remittance: 'Remesas',
    other: 'Otros Ingresos',
  };

  if (type && typeNames[type]) {
    return typeNames[type];
  }

  // Priority 3: Use description
  if (description && description.length > 0) {
    // Capitalize first letter
    return description.charAt(0).toUpperCase() + description.slice(1);
  }

  // Fallback
  return 'Ingreso';
};

const normalizePaymentDateValue = (value: any): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    const numericPortion = parseInt(trimmed.replace(/[^\d-]/g, ''), 10);
    if (!Number.isNaN(numericPortion)) {
      return numericPortion;
    }

    if (trimmed.includes('fin de mes') || trimmed.includes('fin del mes') || trimmed.includes('último día')) {
      return 31;
    }
    if (trimmed.includes('inicio de mes') || trimmed.includes('principio de mes') || trimmed.includes('primer día')) {
      return 1;
    }
    if (trimmed.includes('quincena') || trimmed.includes('medio mes')) {
      return 15;
    }
  }

  return undefined;
};
