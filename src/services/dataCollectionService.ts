import { IntelligentIncomeData, ConversationContext } from './bussyAIService';
import { getOpenAITextResponse } from '../api/chat-service';
import { AIMessage } from '../types/ai';
import { getCurrencySymbol } from '../types/centralAmerica';

export interface CollectedUserData {
  // Income data
  incomeSources: IntelligentIncomeData[];
  monthlyIncome: number;
  incomeStability: "stable" | "variable" | "seasonal";

  // Financial insights from advanced questions
  financialChallenges?: string;
  incomeVariability?: string;
  financialPriorities?: string;
  familySupport?: string;
  spendingTriggers?: string;

  // Context
  country: string;
  currency: string;
  setupMode: "simple" | "advanced";

  // Derived insights
  riskLevel: "low" | "medium" | "high";
  budgetingStyle: "conservative" | "moderate" | "flexible";
  recommendedCategories: string[];
}

export interface BudgetSuggestion {
  category: string;
  suggestedAmount: number;
  percentage: number;
  reasoning: string;
  priority: "essential" | "important" | "optional";
}

export class DataCollectionService {

  /**
   * Compile all collected data from income setup
   */
  static compileUserData(
    incomeSources: IntelligentIncomeData[],
    conversationHistory: any[],
    country: string,
    setupMode: "simple" | "advanced"
  ): CollectedUserData {
    const totalMonthlyIncome = this.calculateTotalMonthlyIncome(incomeSources);
    const incomeStability = this.analyzeIncomeStability(incomeSources);
    const riskLevel = this.assessRiskLevel(incomeSources, totalMonthlyIncome);
    const budgetingStyle = this.determineBudgetingStyle(incomeStability, riskLevel);

    // Extract advanced insights from conversation if available
    const insights = this.extractAdvancedInsights(conversationHistory);

    return {
      incomeSources,
      monthlyIncome: totalMonthlyIncome,
      incomeStability,
      country,
      currency: getCurrencySymbol(country),
      setupMode,
      riskLevel,
      budgetingStyle,
      recommendedCategories: this.getRecommendedCategories(country, totalMonthlyIncome),
      ...insights
    };
  }

  /**
   * Generate budget suggestions using AI
   */
  static async generateBudgetSuggestions(
    userData: CollectedUserData
  ): Promise<BudgetSuggestion[]> {
    const systemPrompt = `Eres un experto en presupuestos para usuarios de Centroamérica. Genera sugerencias de presupuesto personalizadas basadas en el perfil del usuario.

**Perfil del usuario:**
- Ingreso mensual: ${userData.currency}${userData.monthlyIncome.toLocaleString()}
- País: ${userData.country}
- Estabilidad de ingresos: ${userData.incomeStability}
- Estilo de presupuesto recomendado: ${userData.budgetingStyle}
- Nivel de riesgo: ${userData.riskLevel}

${userData.financialChallenges ? `**Desafíos financieros**: ${userData.financialChallenges}` : ''}
${userData.familySupport ? `**Contexto familiar**: ${userData.familySupport}` : ''}
${userData.spendingTriggers ? `**Gatillos de gasto**: ${userData.spendingTriggers}` : ''}

**Instrucciones:**
1. Sugiere 8-12 categorías de presupuesto relevantes para Centroamérica
2. Asigna porcentajes realistas basados en el perfil
3. Incluye categorías culturalmente relevantes (remesas familiares, celebraciones, etc.)
4. Considera el nivel de ingresos y estabilidad
5. Proporciona razonamiento para cada sugerencia

**Formato de respuesta (JSON):**
{
  "suggestions": [
    {
      "category": "Alimentación",
      "suggestedAmount": 1500,
      "percentage": 30,
      "reasoning": "Porcentaje estándar para alimentación ajustado por nivel de ingresos",
      "priority": "essential"
    }
  ]
}

IMPORTANTE: Responde SOLO con el JSON válido, sin texto adicional.`;

    try {
      const messages: AIMessage[] = [
        { role: 'user', content: systemPrompt }
      ];

      const response = await getOpenAITextResponse(messages, {
        temperature: 0.3,
        maxTokens: 2048
      });

      // Clean the response content to extract JSON
      let jsonContent = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // Try to find JSON object between braces
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonContent);
      return parsed.suggestions || [];
    } catch (error) {
      console.error('Error generating budget suggestions:', error);
      return this.getFallbackBudgetSuggestions(userData);
    }
  }

  /**
   * Create personalized summary for Bussy
   */
  static async createPersonalizedSummary(userData: CollectedUserData): Promise<string> {
    const summaryPrompt = `Crea un resumen personalizado y empático de la situación financiera del usuario para Bussy.

**Datos del usuario:**
- Ingreso mensual: ${userData.currency}${userData.monthlyIncome.toLocaleString()}
- Fuentes de ingreso: ${userData.incomeSources.length}
- Estabilidad: ${userData.incomeStability}
- País: ${userData.country}

${userData.financialChallenges ? `Desafíos: ${userData.financialChallenges}` : ''}
${userData.familySupport ? `Contexto familiar: ${userData.familySupport}` : ''}

**Instrucciones:**
- Escribe un resumen en primera persona como si fuera Bussy hablando
- Sé empático y reconoce los desafíos específicos
- Menciona fortalezas y oportunidades
- Máximo 3-4 oraciones
- Tono alentador pero realista

Ejemplo: "Veo que tienes un ingreso estable de Q5,000 y apoyas a tu familia, lo cual habla de tu responsabilidad. Tu mayor desafío parece ser..."`;

    try {
      const messages: AIMessage[] = [
        { role: 'user', content: summaryPrompt }
      ];

      const response = await getOpenAITextResponse(messages, {
        temperature: 0.7,
        maxTokens: 512
      });

      return response.content;
    } catch (error) {
      console.error('Error creating personalized summary:', error);
      return `Perfecto! He configurado tu perfil con ${userData.incomeSources.length} fuente(s) de ingreso totalizando ${userData.currency}${userData.monthlyIncome.toLocaleString()} mensuales. Ahora vamos a crear un presupuesto que funcione para tu situación específica.`;
    }
  }

  /**
   * Calculate total monthly income from all sources
   */
  private static calculateTotalMonthlyIncome(sources: IntelligentIncomeData[]): number {
    return sources.reduce((total, source) => {
      if (source.amount) {
        // Convert to monthly based on frequency
        switch (source.frequency) {
          case "weekly": return total + (source.amount * 4.33);
          case "bi-weekly": return total + (source.amount * 2);
          case "monthly": return total + source.amount;
          case "daily": return total + (source.amount * 30);
          default: return total + (source.amount || 0);
        }
      } else if (source.minAmount && source.maxAmount) {
        // Use conservative estimate for variable income
        const avgAmount = (source.minAmount + source.maxAmount) / 2;
        const conservativeAmount = source.minAmount + (avgAmount - source.minAmount) * 0.6;
        return total + conservativeAmount;
      }
      return total;
    }, 0);
  }

  /**
   * Analyze income stability
   */
  private static analyzeIncomeStability(sources: IntelligentIncomeData[]): "stable" | "variable" | "seasonal" {
    const hasVariable = sources.some(s => s.isVariable);
    const hasSeasonal = sources.some(s => s.frequency === "seasonal");
    const hasProject = sources.some(s => s.frequency === "project");

    if (hasSeasonal) return "seasonal";
    if (hasVariable || hasProject) return "variable";
    return "stable";
  }

  /**
   * Assess financial risk level
   */
  private static assessRiskLevel(
    sources: IntelligentIncomeData[],
    totalIncome: number
  ): "low" | "medium" | "high" {
    const variableSources = sources.filter(s => s.isVariable);
    const variablePercentage = variableSources.length / sources.length;

    if (totalIncome < 3000) return "high"; // Low income
    if (variablePercentage > 0.6) return "high"; // Mostly variable income
    if (variablePercentage > 0.3) return "medium"; // Some variable income
    return "low"; // Stable income
  }

  /**
   * Determine budgeting style
   */
  private static determineBudgetingStyle(
    stability: "stable" | "variable" | "seasonal",
    risk: "low" | "medium" | "high"
  ): "conservative" | "moderate" | "flexible" {
    if (risk === "high" || stability === "seasonal") return "conservative";
    if (risk === "medium" || stability === "variable") return "moderate";
    return "flexible";
  }

  /**
   * Get recommended categories based on country and income
   */
  private static getRecommendedCategories(country: string, income: number): string[] {
    const baseCategories = [
      "Alimentación",
      "Vivienda",
      "Transporte",
      "Servicios básicos",
      "Ahorro de emergencia",
      "Entretenimiento"
    ];

    const culturalCategories = {
      GT: ["Remesas familiares", "Festividades", "Salud", "Educación"],
      MX: ["Familia", "Celebraciones", "Salud", "Educación"],
      // Add other countries as needed
    };

    const countrySpecific = culturalCategories[country as keyof typeof culturalCategories] || [];

    return [...baseCategories, ...countrySpecific];
  }

  /**
   * Extract advanced insights from conversation history
   */
  private static extractAdvancedInsights(conversationHistory: any[]): Partial<CollectedUserData> {
    // This would analyze conversation messages for specific insights
    // For now, return empty object - can be enhanced with AI analysis
    return {};
  }

  /**
   * Fallback budget suggestions when AI fails
   */
  private static getFallbackBudgetSuggestions(userData: CollectedUserData): BudgetSuggestion[] {
    const income = userData.monthlyIncome;

    return [
      {
        category: "Alimentación",
        suggestedAmount: Math.round(income * 0.25),
        percentage: 25,
        reasoning: "Porcentaje estándar para alimentación",
        priority: "essential"
      },
      {
        category: "Vivienda",
        suggestedAmount: Math.round(income * 0.30),
        percentage: 30,
        reasoning: "Renta o gastos de vivienda",
        priority: "essential"
      },
      {
        category: "Transporte",
        suggestedAmount: Math.round(income * 0.15),
        percentage: 15,
        reasoning: "Movilidad diaria",
        priority: "important"
      },
      {
        category: "Ahorro de emergencia",
        suggestedAmount: Math.round(income * 0.10),
        percentage: 10,
        reasoning: "Fondo de emergencia",
        priority: "important"
      },
      {
        category: "Entretenimiento",
        suggestedAmount: Math.round(income * 0.10),
        percentage: 10,
        reasoning: "Gastos de ocio",
        priority: "optional"
      }
    ];
  }
}