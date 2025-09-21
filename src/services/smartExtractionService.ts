import { ParsedIncome } from "../utils/incomeParser";
import { FinancialGoal, BudgetCategory } from "../types/user";

export interface ExtractedData {
  incomes: ParsedIncome[];
  expenses: Array<{
    category: string;
    amount: number;
    frequency: 'monthly' | 'weekly' | 'yearly';
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
Extract financial data from user input and return a structured JSON response.

RULES:
- Extract specific numbers, amounts, frequencies
- Identify payment dates, income sources, expense categories
- Return confidence score (0-1) for each extraction
- Auto-correct obvious errors (e.g., "5k" = 5000)
- Detect user intent: setup preferences vs. data entry

RETURN FORMAT:
{
  "incomes": [{"amount": number, "frequency": "monthly"|"weekly"|"yearly", "type": string, "confidence": number}],
  "expenses": [{"category": string, "amount": number, "frequency": string, "confidence": number}],
  "goals": [{"title": string, "targetAmount": number, "targetDate": string, "confidence": number}],
  "preferences": {
    "budgetingStyle": "strict"|"flexible"|"balanced",
    "savingsGoal": number,
    "paymentDates": [number],
    "priorities": [string]
  },
  "confidence": number,
  "needsClarification": [{"field": string, "question": string}],
  "isComplete": boolean
}

Examples:
- "I earn 5000 monthly" → incomes: [{"amount": 5000, "frequency": "monthly", "type": "salary", "confidence": 0.9}]
- "I pay rent on the 1st and credit card on the 15th" → preferences: {"paymentDates": [1, 15]}
- "I want to save for a house, maybe 50k in 2 years" → goals: [{"title": "house", "targetAmount": 50000, "targetDate": "2027", "confidence": 0.8}]
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

      return {
        incomes: extracted.incomes || [],
        expenses: extracted.expenses || [],
        goals: extracted.goals || [],
        preferences: extracted.preferences || {},
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
    data.incomes.forEach((income, index) => {
      if (income.amount <= 0) {
        errors.push(`Ingreso ${index + 1}: El monto debe ser positivo`);
      }
      if (income.amount > 1000000) {
        suggestions.push(`¿El ingreso de $${income.amount.toLocaleString()} es correcto?`);
      }
      if (!['monthly', 'weekly', 'yearly'].includes(income.frequency)) {
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