import { ParsedIncome } from "../utils/incomeParser";
import { FinancialGoal, BudgetCategory } from "../types/user";

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

PRINCIPLES:
- Always capture explicit amounts, ranges (min/max), and payment frequencies.
- Recognise quincena/bi-weekly, irregular, seasonal, and other common Latin American payment patterns.
- Detect concrete payment dates (e.g. 15, 30) and include them as numbers.
- Identify whether income is variable and include supporting notes when the user mentions context.
- Parse expenses, financial goals, and budgeting preferences when present.
- Return confidence score (0-1) for every extracted record.

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
- "Gano Q4,500 el 15 y Q4,500 el último día del mes" → income with amount 4500, frequency "bi-weekly", paymentDates [15, 30]
- "Recibo remesas de mi mamá, como Q800 el primer domingo" → income type "remittance", amount 800, frequency "monthly", paymentDates [1]
- "Pago la renta el 1 y la tarjeta el 15" → preferences.paymentDates [1,15]
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

        return {
          ...income,
          amount: normalizedAmount ?? income.amount,
          minAmount: Number.isFinite(minAmount) ? minAmount : income.minAmount,
          maxAmount: Number.isFinite(maxAmount) ? maxAmount : income.maxAmount,
          frequency: (frequency as ParsedIncome['frequency']) || income.frequency,
          type: type || income.type,
          paymentDates: Array.isArray(income.paymentDates)
            ? income.paymentDates
                .map((value: any) => parseInt(value, 10))
                .filter((value: number) => Number.isInteger(value))
            : undefined,
        } as ParsedIncome;
      });

      const preferences = extracted.preferences || {};
      if (Array.isArray(preferences.paymentDates)) {
        preferences.paymentDates = preferences.paymentDates
          .map((value: any) => parseInt(value, 10))
          .filter((value: number) => Number.isInteger(value));
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
      if (income.amount <= 0 && !(income.minAmount && income.maxAmount && income.minAmount > 0)) {
        errors.push(`Ingreso ${index + 1}: El monto debe ser positivo`);
      }
      if (income.amount > 0 && income.amount > 1000000) {
        suggestions.push(`¿El ingreso de $${income.amount.toLocaleString()} es correcto?`);
      }
      if (!allowedFrequencies.includes(income.frequency as any)) {
        errors.push(`Ingreso ${index + 1}: Frecuencia inválida`);
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

  static generateConfirmationPrompt(data: ExtractedData): string {
    const parts: string[] = [];

    if (data.incomes.length > 0) {
      parts.push(`**Ingresos detectados:**`);
      data.incomes.forEach(income => {
        parts.push(`• $${income.amount.toLocaleString()} ${income.frequency} (${income.type || 'ingreso'})`);
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
}
