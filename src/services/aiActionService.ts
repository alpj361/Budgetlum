import { useUserStore } from "../state/userStore";
import { useExpenseStore } from "../state/expenseStore";
import { IncomeSource, FinancialGoal, BudgetCategory } from "../types/user";
import { Expense } from "../types/expense";

export interface AIAction {
  type: 'ADD_EXPENSE' | 'SET_INCOME' | 'MODIFY_BUDGET' | 'SET_GOAL' | 'GENERATE_BUDGET';
  payload: any;
  requiresConfirmation: boolean;
  conversationId: string;
  confirmation?: string;
}

export interface ParsedAction {
  action: string;
  data: any;
  confirmation: string;
}

class AIActionService {
  /**
   * Parse AI responses for embedded actions
   * Looks for JSON blocks in AI response and extracts actions
   */
  extractActions(aiResponse: string): AIAction[] {
    const actions: AIAction[] = [];

    // Look for JSON blocks using regex
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(aiResponse)) !== null) {
      try {
        const parsedAction: ParsedAction = JSON.parse(match[1]);

        const action: AIAction = {
          type: parsedAction.action as AIAction['type'],
          payload: parsedAction.data,
          requiresConfirmation: true,
          conversationId: Date.now().toString(),
          confirmation: parsedAction.confirmation
        };

        // Validate action type
        if (this.isValidActionType(action.type)) {
          actions.push(action);
        }
      } catch (error) {
        console.warn("Failed to parse action JSON:", error);
      }
    }

    return actions;
  }

  /**
   * Execute confirmed actions
   */
  async executeAction(action: AIAction): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.type) {
        case 'ADD_EXPENSE':
          return await this.executeAddExpense(action.payload);

        case 'SET_INCOME':
          return await this.executeSetIncome(action.payload);

        case 'MODIFY_BUDGET':
          return await this.executeModifyBudget(action.payload);

        case 'SET_GOAL':
          return await this.executeSetGoal(action.payload);

        case 'GENERATE_BUDGET':
          return await this.executeGenerateBudget(action.payload);

        default:
          return { success: false, message: `Tipo de acción no reconocido: ${action.type}` };
      }
    } catch (error) {
      console.error("Error executing action:", error);
      return { success: false, message: "Error al ejecutar la acción" };
    }
  }

  /**
   * Generate confirmation UI data
   */
  getConfirmationMessage(action: AIAction): string {
    if (action.confirmation) {
      return action.confirmation;
    }

    // Fallback confirmation messages
    switch (action.type) {
      case 'ADD_EXPENSE':
        return `¿Agregar gasto de $${action.payload.amount} para ${action.payload.description}?`;

      case 'SET_INCOME':
        return `¿Agregar ingreso de $${action.payload.amount} ${action.payload.frequency} por ${action.payload.name}?`;

      case 'MODIFY_BUDGET':
        return `¿Modificar presupuesto de ${action.payload.category} a $${action.payload.limit}?`;

      case 'SET_GOAL':
        return `¿Agregar meta financiera: ${action.payload.title} ($${action.payload.targetAmount})?`;

      case 'GENERATE_BUDGET':
        return `¿Generar presupuesto automático basado en tus ingresos?`;

      default:
        return "¿Ejecutar esta acción?";
    }
  }

  /**
   * Get detailed action preview for UI
   */
  getActionPreview(action: AIAction): { title: string; details: string[] } {
    switch (action.type) {
      case 'ADD_EXPENSE':
        return {
          title: "Agregar Gasto",
          details: [
            `Cantidad: $${action.payload.amount}`,
            `Descripción: ${action.payload.description}`,
            `Categoría: ${action.payload.category}`,
            action.payload.isRecurring ? "Gasto recurrente" : "Gasto único"
          ]
        };

      case 'SET_INCOME':
        return {
          title: "Agregar Fuente de Ingresos",
          details: [
            `Nombre: ${action.payload.name}`,
            `Cantidad: $${action.payload.amount}`,
            `Frecuencia: ${action.payload.frequency}`,
            `Tipo: ${action.payload.type || 'general'}`
          ]
        };

      case 'MODIFY_BUDGET':
        return {
          title: "Modificar Presupuesto",
          details: [
            `Categoría: ${action.payload.category}`,
            `Nuevo límite: $${action.payload.limit}`,
            `Período: ${action.payload.period || 'mensual'}`
          ]
        };

      case 'SET_GOAL':
        return {
          title: "Agregar Meta Financiera",
          details: [
            `Título: ${action.payload.title}`,
            `Meta: $${action.payload.targetAmount}`,
            `Prioridad: ${action.payload.priority || 'medium'}`,
            `Tipo: ${action.payload.type || 'savings'}`
          ]
        };

      case 'GENERATE_BUDGET':
        return {
          title: "Generar Presupuesto Automático",
          details: [
            "Se creará un presupuesto basado en la regla 50/30/20",
            "50% para gastos esenciales",
            "30% para gastos personales",
            "20% para ahorros y metas"
          ]
        };

      default:
        return {
          title: "Acción Desconocida",
          details: ["Acción no reconocida"]
        };
    }
  }

  // Private helper methods

  private isValidActionType(type: string): type is AIAction['type'] {
    return ['ADD_EXPENSE', 'SET_INCOME', 'MODIFY_BUDGET', 'SET_GOAL', 'GENERATE_BUDGET'].includes(type);
  }

  private async executeAddExpense(payload: any): Promise<{ success: boolean; message: string }> {
    const { addExpense } = useExpenseStore.getState();

    const expense: Omit<Expense, "id"> = {
      amount: payload.amount,
      description: payload.description,
      category: payload.category,
      date: payload.date || new Date().toISOString(),
      isRecurring: payload.isRecurring || false
    };

    addExpense(expense);
    return { success: true, message: `Gasto de $${payload.amount} agregado exitosamente` };
  }

  private async executeSetIncome(payload: any): Promise<{ success: boolean; message: string }> {
    const { addIncome } = useUserStore.getState();

    const income: Omit<IncomeSource, "id"> = {
      name: payload.name,
      amount: payload.amount,
      frequency: payload.frequency,
      type: payload.type || 'salary',
      isActive: true,
      isPrimary: payload.isPrimary || false,
      description: payload.description
    };

    addIncome(income);
    return { success: true, message: `Fuente de ingresos "${payload.name}" agregada exitosamente` };
  }

  private async executeModifyBudget(payload: any): Promise<{ success: boolean; message: string }> {
    const { setBudget } = useExpenseStore.getState();

    setBudget(payload.category, payload.limit, payload.period || 'monthly');
    return { success: true, message: `Presupuesto para ${payload.category} actualizado` };
  }

  private async executeSetGoal(payload: any): Promise<{ success: boolean; message: string }> {
    const { addGoal } = useUserStore.getState();

    const goal: Omit<FinancialGoal, "id"> = {
      title: payload.title,
      description: payload.description,
      targetAmount: payload.targetAmount,
      currentAmount: payload.currentAmount || 0,
      targetDate: payload.targetDate,
      priority: payload.priority || 'medium',
      type: payload.type || 'savings',
      isActive: true
    };

    addGoal(goal);
    return { success: true, message: `Meta financiera "${payload.title}" agregada exitosamente` };
  }

  private async executeGenerateBudget(payload: any): Promise<{ success: boolean; message: string }> {
    const { getTotalIncome } = useUserStore.getState();
    const { setBudget } = useExpenseStore.getState();

    const monthlyIncome = getTotalIncome('monthly');

    if (monthlyIncome === 0) {
      return { success: false, message: "No se puede generar presupuesto sin ingresos configurados" };
    }

    // Apply 50/30/20 rule with Spanish categories
    const essentialCategories = [
      { category: "Vivienda", percentage: 0.30 },
      { category: "Alimentación", percentage: 0.15 },
      { category: "Transporte", percentage: 0.05 }
    ];

    const personalCategories = [
      { category: "Entretenimiento", percentage: 0.15 },
      { category: "Ropa", percentage: 0.10 },
      { category: "Otros", percentage: 0.05 }
    ];

    const savingsCategories = [
      { category: "Ahorros", percentage: 0.20 }
    ];

    // Set budgets for each category
    [...essentialCategories, ...personalCategories, ...savingsCategories].forEach(({ category, percentage }) => {
      const budgetAmount = monthlyIncome * percentage;
      setBudget(category, budgetAmount, 'monthly');
    });

    return {
      success: true,
      message: `Presupuesto generado exitosamente basado en ingresos de $${monthlyIncome.toLocaleString()}`
    };
  }
}

// Singleton instance
export const aiActionService = new AIActionService();