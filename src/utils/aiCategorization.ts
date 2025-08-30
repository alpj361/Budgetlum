import { getOpenAIChatResponse } from "../api/chat-service";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "../types/expense";

export const categorizeExpense = async (description: string): Promise<ExpenseCategory> => {
  try {
    const prompt = `Eres un asistente que categoriza gastos. Categorías: ${EXPENSE_CATEGORIES.join(", ")}\nDevuelve SOLO la categoría exacta.\nDescripción: "${description}"\nCategoría:`;
    const response = await getOpenAIChatResponse(prompt);
    const category = response.content.trim();
    if ((EXPENSE_CATEGORIES as string[]).includes(category)) return category as ExpenseCategory;
    return "Otros";
  } catch {
    return "Otros";
  }
};

export const categorizeDescriptionsBatch = async (descriptions: string[]): Promise<ExpenseCategory[]> => {
  try {
    const prompt = `Clasifica cada descripción en una de: ${EXPENSE_CATEGORIES.join(", ")}.\nDevuelve SOLO un arreglo JSON de cadenas con el mismo orden.\nDescripciones: ${JSON.stringify(descriptions)}`;
    const res = await getOpenAIChatResponse(prompt);
    const arr = JSON.parse(res.content.trim());
    if (Array.isArray(arr)) {
      return arr.map((c) => ((EXPENSE_CATEGORIES as string[]).includes(c) ? (c as ExpenseCategory) : "Otros"));
    }
    return descriptions.map(() => "Otros");
  } catch {
    return descriptions.map(() => "Otros");
  }
};

export const extractExpenseFromReceipt = async (receiptText: string): Promise<{
  amount?: number;
  description?: string;
  category?: ExpenseCategory;
}> => {
  try {
    const prompt = `
Eres un asistente que extrae datos de recibos. Devuelve JSON.

Texto del recibo: "${receiptText}"

Extrae:
- amount: Monto total (número, sin símbolo)
- description: Breve descripción de la compra
- category: Elige entre: ${EXPENSE_CATEGORIES.join(", ")}

Devuelve SOLO JSON válido con este formato:
{
  "amount": 25.99,
  "description": "Compra supermercado",
  "category": "Alimentación"
}

Si no puedes extraer un campo, colócalo en null.

JSON:`;

    const response = await getOpenAIChatResponse(prompt);
    
    try {
      const parsed = JSON.parse(response.content.trim());
      // Validate the category
      if (parsed.category && !(EXPENSE_CATEGORIES as string[]).includes(parsed.category)) {
        parsed.category = "Otros";
      }
      return {
        amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
        description: parsed.description || undefined,
        category: parsed.category || "Otros",
      };
    } catch {
      return {};
    }
  } catch {
    return {};
  }
};