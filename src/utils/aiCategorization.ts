import { getOpenAIChatResponse } from "../api/chat-service";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "../types/expense";

export const categorizeExpense = async (description: string): Promise<ExpenseCategory> => {
  try {
    const prompt = `
You are an expense categorization assistant. Given an expense description, categorize it into one of these categories:

Categories: ${EXPENSE_CATEGORIES.join(", ")}

Rules:
- Return ONLY the category name, nothing else
- Choose the most appropriate category
- If unsure, choose "Other"

Expense description: "${description}"

Category:`;

    const response = await getOpenAIChatResponse(prompt);
    const category = response.content.trim();
    
    // Validate that the response is a valid category
    if (EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
      return category as ExpenseCategory;
    }
    
    // Fallback to "Other" if the AI response is not valid
    return "Other";
  } catch (error) {
    console.error("Error categorizing expense:", error);
    // Fallback to "Other" if there's an error
    return "Other";
  }
};

export const extractExpenseFromReceipt = async (receiptText: string): Promise<{
  amount?: number;
  description?: string;
  category?: ExpenseCategory;
}> => {
  try {
    const prompt = `
You are a receipt parsing assistant. Extract expense information from this receipt text and return it as JSON.

Receipt text: "${receiptText}"

Extract:
- amount: The total amount (number only, no currency symbol)
- description: A brief description of what was purchased
- category: Choose from these categories: ${EXPENSE_CATEGORIES.join(", ")}

Return ONLY valid JSON in this format:
{
  "amount": 25.99,
  "description": "Grocery shopping",
  "category": "Groceries"
}

If you cannot extract the information, return null for that field.

JSON:`;

    const response = await getOpenAIChatResponse(prompt);
    
    try {
      const parsed = JSON.parse(response.content.trim());
      
      // Validate the category
      if (parsed.category && !EXPENSE_CATEGORIES.includes(parsed.category)) {
        parsed.category = "Other";
      }
      
      return {
        amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
        description: parsed.description || undefined,
        category: parsed.category || "Other",
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {};
    }
  } catch (error) {
    console.error("Error extracting expense from receipt:", error);
    return {};
  }
};