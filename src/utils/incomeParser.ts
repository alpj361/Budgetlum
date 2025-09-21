export interface ParsedIncome {
  name: string;
  amount: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular' | 'project' | 'seasonal' | 'daily';
  type?: 'salary' | 'freelance' | 'business' | 'rental' | 'remittance' | 'other';
  isVariable?: boolean;
  minAmount?: number;
  maxAmount?: number;
  paymentDates?: number[];
  description?: string;
  confidence: number; // 0-1 score for parsing confidence
}

export interface ParsedExpense {
  amount: number;
  description: string;
  category?: string;
  isRecurring?: boolean;
  confidence: number;
}

/**
 * Parse natural language income descriptions
 * Handles various patterns in Spanish and English
 */
export function parseIncomeFromText(text: string): ParsedIncome[] {
  const incomes: ParsedIncome[] = [];
  const normalizedText = text.toLowerCase().trim();

  // Patterns for income amounts
  const amountPatterns = [
    // "5k", "5000", "$5000", "5,000"
    /(?:[$]?)([\d,]+)k?\b/g,
    // Ranges like "500-800" or "$500 a $800"
    /([\d,]+)\s*(?:a|hasta|to|-)\s*([\d,]+)/g,
  ];

  // Frequency patterns (Spanish focus)
  const frequencyMap: Record<string, ParsedIncome['frequency']> = {
    'semanal': 'weekly',
    'weekly': 'weekly',
    'semana': 'weekly',
    'quincenal': 'bi-weekly',
    'bi-weekly': 'bi-weekly',
    'biweekly': 'bi-weekly',
    'cada dos semanas': 'bi-weekly',
    'mensual': 'monthly',
    'monthly': 'monthly',
    'mes': 'monthly',
    'al mes': 'monthly',
    'trimestral': 'quarterly',
    'quarterly': 'quarterly',
    'anual': 'yearly',
    'yearly': 'yearly',
    'año': 'yearly',
    'por año': 'yearly',
    'irregular': 'irregular',
    'variable': 'irregular',
    'por proyecto': 'project',
    'proyecto': 'project',
    'seasonal': 'seasonal',
    'temporada': 'seasonal',
    'estacional': 'seasonal',
    'diario': 'daily',
    'diaria': 'daily',
    'diariamente': 'daily',
    'daily': 'daily'
  };

  // Income type patterns
  const typeMap: Record<string, ParsedIncome['type']> = {
    'salario': 'salary',
    'sueldo': 'salary',
    'trabajo': 'salary',
    'empleo': 'salary',
    'salary': 'salary',
    'freelance': 'freelance',
    'independiente': 'freelance',
    'consultoría': 'freelance',
    'proyecto': 'freelance',
    'negocio': 'business',
    'empresa': 'business',
    'business': 'business',
    'renta': 'rental',
    'alquiler': 'rental',
    'rental': 'rental',
    'remesa': 'remittance',
    'envío': 'remittance',
    'remittance': 'remittance'
  };

  // Split text into potential income segments
  const segments = normalizedText.split(/[,;]|(\sy\s)|(\sand\s)/);

  segments.forEach(segment => {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment || trimmedSegment.length < 3) return;

    // Extract amount(s)
    let amount = 0;
    let isVariable = false;
    let minAmount: number | undefined;
    let maxAmount: number | undefined;

    // Check for range pattern first
    const rangeMatch = trimmedSegment.match(/([\d,]+)\s*(?:a|hasta|to|-)\s*([\d,]+)/);
    if (rangeMatch) {
      minAmount = parseFloat(rangeMatch[1].replace(/,/g, ''));
      maxAmount = parseFloat(rangeMatch[2].replace(/,/g, ''));
      amount = (minAmount + maxAmount) / 2; // Use average
      isVariable = true;
    } else {
      // Single amount pattern
      const amountMatch = trimmedSegment.match(/(?:[$]?)([\d,]+)k?\b/);
      if (amountMatch) {
        let parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
        // Handle "k" suffix
        if (amountMatch[0].includes('k')) {
          parsedAmount *= 1000;
        }
        amount = parsedAmount;
      }
    }

    if (amount === 0) return; // Skip if no amount found

    // Determine frequency
    let frequency: ParsedIncome['frequency'] = 'monthly'; // default
    for (const [pattern, freq] of Object.entries(frequencyMap)) {
      if (trimmedSegment.includes(pattern)) {
        frequency = freq;
        break;
      }
    }

    // Determine type
    let type: ParsedIncome['type'] = 'other'; // default
    for (const [pattern, incomeType] of Object.entries(typeMap)) {
      if (trimmedSegment.includes(pattern)) {
        type = incomeType;
        break;
      }
    }

    // Generate name based on context
    let name = 'Ingresos';
    if (type === 'salary') name = 'Salario';
    else if (type === 'freelance') name = 'Freelance';
    else if (type === 'business') name = 'Negocio';
    else if (type === 'rental') name = 'Renta';
    else if (type === 'remittance') name = 'Remesas';

    // Calculate confidence based on how many elements we identified
    let confidence = 0.3; // base confidence
    if (amount > 0) confidence += 0.4;
    if (frequency !== 'monthly') confidence += 0.15; // non-default frequency
    if (type !== 'other') confidence += 0.15; // identified type

    const parsedIncome: ParsedIncome = {
      name,
      amount,
      frequency,
      type,
      isVariable,
      minAmount,
      maxAmount,
      confidence: Math.min(confidence, 1.0)
    };

    incomes.push(parsedIncome);
  });

  // Remove duplicates and merge similar incomes
  return mergeSimilarIncomes(incomes);
}

/**
 * Parse natural language expense descriptions
 */
export function parseExpenseFromText(text: string): ParsedExpense {
  const normalizedText = text.toLowerCase().trim();

  // Extract amount
  let amount = 0;
  const amountMatch = normalizedText.match(/(?:[$]?)([\d,]+(?:\.\d{2})?)\b/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Category mapping (Spanish focus)
  const categoryMap: Record<string, string> = {
    'comida': 'Alimentación',
    'groceries': 'Alimentación',
    'supermercado': 'Alimentación',
    'restaurante': 'Alimentación',
    'renta': 'Vivienda',
    'alquiler': 'Vivienda',
    'rent': 'Vivienda',
    'casa': 'Vivienda',
    'gasolina': 'Transporte',
    'gas': 'Transporte',
    'taxi': 'Transporte',
    'uber': 'Transporte',
    'transporte': 'Transporte',
    'ropa': 'Ropa',
    'clothes': 'Ropa',
    'vestido': 'Ropa',
    'entretenimiento': 'Entretenimiento',
    'cine': 'Entretenimiento',
    'película': 'Entretenimiento',
    'diversión': 'Entretenimiento',
    'salud': 'Salud',
    'doctor': 'Salud',
    'medicina': 'Salud',
    'gym': 'Salud',
    'gimnasio': 'Salud'
  };

  // Determine category
  let category = 'Otros'; // default
  for (const [pattern, cat] of Object.entries(categoryMap)) {
    if (normalizedText.includes(pattern)) {
      category = cat;
      break;
    }
  }

  // Check if it's recurring
  const recurringPatterns = ['mensual', 'semanal', 'cada mes', 'cada semana', 'monthly', 'weekly', 'recurring'];
  const isRecurring = recurringPatterns.some(pattern => normalizedText.includes(pattern));

  // Extract description (remove amount and common prefixes)
  let description = text
    .replace(/(?:[$]?)([\d,]+(?:\.\d{2})?)\b/g, '') // Remove amount
    .replace(/^(pagué|gasté|compré|spent|paid)/i, '') // Remove action verbs
    .trim();

  if (!description) {
    description = category;
  }

  // Calculate confidence
  let confidence = 0.2; // base
  if (amount > 0) confidence += 0.5;
  if (category !== 'Otros') confidence += 0.2;
  if (description.length > 2) confidence += 0.1;

  return {
    amount,
    description: description || category,
    category,
    isRecurring,
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Merge similar income sources to avoid duplicates
 */
function mergeSimilarIncomes(incomes: ParsedIncome[]): ParsedIncome[] {
  const merged: ParsedIncome[] = [];

  incomes.forEach(income => {
    const existing = merged.find(m =>
      m.type === income.type &&
      m.frequency === income.frequency &&
      Math.abs(m.amount - income.amount) < (income.amount * 0.1) // within 10%
    );

    if (existing) {
      // Merge by taking higher confidence data
      if (income.confidence > existing.confidence) {
        Object.assign(existing, income);
      }
    } else {
      merged.push(income);
    }
  });

  return merged.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Convert parsed income to user-friendly summary
 */
export function formatIncomesSummary(incomes: ParsedIncome[]): string {
  if (incomes.length === 0) return "No se identificaron ingresos.";

  const summaries = incomes.map(income => {
    let summary = `${income.name}: $${income.amount.toLocaleString()}`;

    const frequencyLabels: Record<string, string> = {
      'weekly': 'semanal',
      'bi-weekly': 'quincenal',
      'monthly': 'mensual',
      'quarterly': 'trimestral',
      'yearly': 'anual',
      'irregular': 'irregular'
    };

    summary += ` ${frequencyLabels[income.frequency] || income.frequency}`;

    if (income.isVariable && income.minAmount && income.maxAmount) {
      summary += ` (rango: $${income.minAmount.toLocaleString()} - $${income.maxAmount.toLocaleString()})`;
    }

    return summary;
  });

  return summaries.join('\n');
}

/**
 * Validate parsed income data
 */
export function validateParsedIncome(income: ParsedIncome): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (income.amount <= 0) {
    errors.push("La cantidad debe ser mayor a 0");
  }

  if (income.amount > 1000000) {
    errors.push("La cantidad parece demasiado alta");
  }

  if (income.confidence < 0.3) {
    errors.push("La información extraída tiene baja confianza");
  }

  if (income.isVariable && (!income.minAmount || !income.maxAmount)) {
    errors.push("Los ingresos variables requieren rango mínimo y máximo");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
