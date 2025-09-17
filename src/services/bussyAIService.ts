import { getCurrencySymbol, CENTRAL_AMERICA_COUNTRIES } from '../types/centralAmerica';
import { getOpenAITextResponse } from '../api/chat-service';
import { AIMessage } from '../types/ai';

export interface IntelligentIncomeData {
  name?: string;
  type?: "salary" | "freelance" | "business" | "rental" | "remittance" | "other";
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  frequency?: "monthly" | "bi-weekly" | "weekly" | "project" | "seasonal" | "daily";
  isVariable?: boolean;
  country?: string;
  currency?: string;
  employmentType?: "formal" | "informal" | "freelance" | "business";
  company?: string;
  confidence?: number;
  payDates?: number[];
  seasonalInfo?: string;
  additionalInfo?: string;
}

export interface ConversationContext {
  collectedSources: IntelligentIncomeData[];
  missingInfo: string[];
  currentFocus?: string;
  conversationPhase: "discovery" | "details" | "confirmation" | "complete";
  userCountry: string;
  totalConfidence: number;
}

export class BussyAIService {

  /**
   * Enhanced income parsing using real GPT-4o AI
   */
  static async parseIncomeFromText(text: string, context: ConversationContext): Promise<{
    extractedData: IntelligentIncomeData[];
    updatedContext: ConversationContext;
    followUpQuestions: string[];
  }> {
    const lowerText = text.toLowerCase();
    const extractedData: IntelligentIncomeData[] = [];
    const followUpQuestions: string[] = [];

    // Enhanced amount detection with currency support
    const amountPatterns = [
      // Guatemalan Quetzal: Q5000, Q 5,000, 5000 quetzales
      /(?:q|quetzal(?:es)?|gtq)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Mexican Peso: $5000, 5000 pesos
      /(?:\$|peso(?:s)?|mxn)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      // US Dollar: $5000, 5000 dólares
      /(?:\$|d[oó]lar(?:es)?|usd)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      // General numbers: 5000, 5,000
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
    ];

    // Frequency detection with Spanish terms
    const frequencyMap = {
      monthly: ["mensual", "mes", "monthly", "cada mes", "al mes", "por mes"],
      "bi-weekly": ["quincenal", "quincena", "cada 15", "cada quince", "bi-weekly", "biweekly"],
      weekly: ["semanal", "semana", "weekly", "cada semana", "por semana"],
      daily: ["diario", "día", "daily", "cada día", "por día"],
      project: ["proyecto", "project", "por proyecto", "freelance", "consultoría"],
      seasonal: ["temporada", "seasonal", "época", "estacional", "temporalmente"]
    };

    // Income type detection
    const typePatterns = {
      salary: ["salario", "sueldo", "empleo", "trabajo", "empleado", "salary", "job"],
      freelance: ["freelance", "independiente", "consultor", "proyecto", "contractor"],
      business: ["negocio", "empresa", "business", "propio", "comercio", "tienda"],
      rental: ["renta", "alquiler", "rental", "arriendo", "inmueble"],
      remittance: ["remesa", "familia", "envío", "transferencia", "remittance"]
    };

    // Advanced parsing logic
    let detectedIncome: IntelligentIncomeData = {
      confidence: 0
    };

    // 1. Parse amounts with intelligence
    const amounts = this.extractAmounts(text);
    if (amounts.length === 1) {
      detectedIncome.amount = amounts[0];
      detectedIncome.confidence += 0.3;
    } else if (amounts.length === 2) {
      detectedIncome.minAmount = Math.min(...amounts);
      detectedIncome.maxAmount = Math.max(...amounts);
      detectedIncome.isVariable = true;
      detectedIncome.confidence += 0.25;
    }

    // 2. Detect frequency
    for (const [freq, terms] of Object.entries(frequencyMap)) {
      if (terms.some(term => lowerText.includes(term))) {
        detectedIncome.frequency = freq as any;
        detectedIncome.confidence += 0.2;
        break;
      }
    }

    // 3. Detect income type
    for (const [type, terms] of Object.entries(typePatterns)) {
      if (terms.some(term => lowerText.includes(term))) {
        detectedIncome.type = type as any;
        detectedIncome.confidence += 0.2;
        break;
      }
    }

    // 4. Extract company/source name
    const companyPatterns = [
      /(?:trabajo en|empleado en|work at|en la empresa)\s+([a-záéíóúñ\s]+)/i,
      /(?:empresa|company|trabajo)\s+([a-záéíóúñ\s]+)/i
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) {
        detectedIncome.company = match[1].trim();
        detectedIncome.name = `Trabajo en ${detectedIncome.company}`;
        detectedIncome.confidence += 0.15;
        break;
      }
    }

    // 5. Detect variability indicators
    const variabilityTerms = ["varía", "variable", "depende", "sometimes", "varies", "diferente"];
    if (variabilityTerms.some(term => lowerText.includes(term))) {
      detectedIncome.isVariable = true;
      detectedIncome.confidence += 0.1;
    }

    // 6. Detect seasonal patterns
    const seasonalTerms = ["temporada", "época", "seasonal", "navidad", "verano", "invierno"];
    if (seasonalTerms.some(term => lowerText.includes(term))) {
      detectedIncome.frequency = "seasonal";
      detectedIncome.seasonalInfo = "Usuario mencionó patrones estacionales";
      detectedIncome.confidence += 0.1;
    }

    // 7. Set defaults based on context
    if (!detectedIncome.name && detectedIncome.type) {
      detectedIncome.name = this.getDefaultNameForType(detectedIncome.type);
    }

    if (!detectedIncome.type && detectedIncome.amount) {
      detectedIncome.type = "salary"; // Default assumption
      detectedIncome.confidence += 0.05;
    }

    // Only add if we have meaningful data
    if (detectedIncome.confidence > 0.1) {
      detectedIncome.country = context.userCountry;
      detectedIncome.currency = getCurrencySymbol(context.userCountry);
      extractedData.push(detectedIncome);
    }

    // Generate intelligent follow-up questions
    const updatedContext = this.updateContext(context, extractedData);
    const intelligentQuestions = this.generateIntelligentQuestions(detectedIncome, updatedContext, text);

    return {
      extractedData,
      updatedContext,
      followUpQuestions: intelligentQuestions
    };
  }

  /**
   * Extract monetary amounts from text
   */
  private static extractAmounts(text: string): number[] {
    const amounts: number[] = [];

    // Enhanced amount patterns
    const patterns = [
      /(?:q|quetzal(?:es)?)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:quetzal(?:es)?|peso(?:s)?|d[oó]lar(?:es)?)/gi,
      // Standalone numbers that look like money
      /(?:gano|recibo|son|tengo)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:al mes|mensual|por mes)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0 && amount < 1000000) { // Reasonable range
          amounts.push(amount);
        }
      }
    }

    return [...new Set(amounts)].sort((a, b) => a - b); // Remove duplicates and sort
  }

  /**
   * Update conversation context with new data
   */
  private static updateContext(
    context: ConversationContext,
    newData: IntelligentIncomeData[]
  ): ConversationContext {
    const updatedSources = [...context.collectedSources];

    for (const data of newData) {
      // Check if we already have this source (basic deduplication)
      const existing = updatedSources.find(source =>
        source.type === data.type &&
        Math.abs((source.amount || 0) - (data.amount || 0)) < 100
      );

      if (existing) {
        // Merge data
        Object.assign(existing, data);
        existing.confidence = Math.max(existing.confidence || 0, data.confidence || 0);
      } else {
        updatedSources.push(data);
      }
    }

    // Calculate missing information
    const missingInfo: string[] = [];
    for (const source of updatedSources) {
      if (!source.amount && !source.minAmount) missingInfo.push("amount");
      if (!source.frequency) missingInfo.push("frequency");
      if (!source.name) missingInfo.push("name");
    }

    // Determine conversation phase
    let phase: ConversationContext["conversationPhase"] = "discovery";
    if (updatedSources.length > 0) {
      const avgConfidence = updatedSources.reduce((sum, s) => sum + (s.confidence || 0), 0) / updatedSources.length;
      if (avgConfidence > 0.7 && missingInfo.length < 2) {
        phase = "confirmation";
      } else if (updatedSources.length > 0) {
        phase = "details";
      }
    }

    return {
      ...context,
      collectedSources: updatedSources,
      missingInfo: [...new Set(missingInfo)],
      conversationPhase: phase,
      totalConfidence: updatedSources.reduce((sum, s) => sum + (s.confidence || 0), 0)
    };
  }

  /**
   * Generate intelligent follow-up questions
   */
  private static generateIntelligentQuestions(
    detected: IntelligentIncomeData,
    context: ConversationContext,
    originalText: string
  ): string[] {
    const questions: string[] = [];
    const currencySymbol = getCurrencySymbol(context.userCountry);

    // Phase-based questioning
    switch (context.conversationPhase) {
      case "discovery":
        if (detected.amount && !detected.frequency) {
          questions.push(`Perfecto, veo que mencionaste ${currencySymbol}${detected.amount?.toLocaleString()}. ¿Con qué frecuencia recibes este dinero?`);
        }
        if (detected.type === "freelance" && !detected.isVariable) {
          questions.push("¿Tus ingresos de freelance son consistentes o varían según los proyectos?");
        }
        if (!detected.type && detected.amount) {
          questions.push("¿Este dinero es de un trabajo fijo, freelance, negocio propio o de dónde viene?");
        }
        break;

      case "details":
        if (detected.isVariable && !detected.minAmount) {
          questions.push("Ya que mencionas que varía, ¿cuál sería el rango? Por ejemplo: entre Q3,000 y Q8,000");
        }
        if (detected.type === "business" && !detected.seasonalInfo) {
          questions.push("¿Tu negocio tiene temporadas mejores o peores en el año?");
        }
        if (detected.frequency === "project" && !detected.additionalInfo) {
          questions.push("¿Más o menos cuántos proyectos tienes por mes?");
        }
        break;

      case "confirmation":
        questions.push("Déjame confirmar lo que entendí...");
        break;
    }

    // Context-aware questions
    if (context.collectedSources.length === 1 && detected.confidence > 0.5) {
      questions.push("¿Tienes alguna otra fuente de ingresos además de esta?");
    }

    // Missing critical info
    if (context.missingInfo.includes("amount") && questions.length === 0) {
      questions.push("¿Cuánto recibes aproximadamente?");
    }

    return questions.slice(0, 2); // Limit to 2 questions max
  }

  /**
   * Generate intelligent Bussy response using GPT-4o
   */
  static async generateBussyResponse(
    userMessage: string,
    context: ConversationContext
  ): Promise<string> {
    const currencySymbol = getCurrencySymbol(context.userCountry);
    const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === context.userCountry);

    const systemPrompt = `Eres Bussy, un asistente financiero inteligente especializado en configurar ingresos para usuarios de Centroamérica. Tu objetivo es crear una experiencia de configuración personalizada y culturalmente relevante.

**Tu misión**: Ayudar al usuario a configurar sus fuentes de ingreso mientras entiendes profundamente su situación financiera y contexto cultural.

**Contexto actual**:
- País: ${country?.name} (${currencySymbol})
- Fase de conversación: ${context.conversationPhase}
- Fuentes ya identificadas: ${context.collectedSources.length}
- Información faltante: ${context.missingInfo.join(', ')}

**Instrucciones técnicas**:
1. Responde en español de manera natural y amigable
2. Extrae información de ingresos del mensaje del usuario
3. Reconoce patrones de fechas: "me pagan el 15 y 30", "cada viernes", "fin de mes"
4. Detecta montos: "Q5000", "entre 3000 y 8000", "$2500 dólares"
5. Identifica tipos: trabajo, freelance, negocio, remesas
6. Para bonos centroamericanos (aguinaldo, bono 14), pregunta si aplican

**Preguntas de conversación profunda** (úsalas estratégicamente durante la configuración):

🎯 **Desafíos financieros**: "¿Cuál es tu mayor desafío con el dinero en este momento?"
(Esto diferencia la app al enfocarse en problemas específicos del usuario)

📊 **Análisis de patrones de ingreso**: "¿Tus ingresos varían de mes a mes?"
(Crucial para usuarios con ingresos irregulares)

💡 **Evaluación de prioridades financieras**: "Si tuvieras dinero extra este mes, ¿qué harías con él primero?"
(Revela valores y prioridades, no solo hábitos de gasto)

👥 **Contexto cultural**: "¿Apoyas financieramente a familiares?"
(Común en Guatemala, rara vez abordado en apps estadounidenses)

⚠️ **Identificación de gatillos de gasto**: "¿Cuándo es más probable que gastes más de lo planeado?"
(Proporciona insights psicológicos para mejores límites presupuestarios)

**Estrategia de conversación**:
- Comienza con ingresos básicos, luego profundiza gradualmente
- Haz estas preguntas cuando el contexto sea natural, no forzado
- Usa las respuestas para personalizar consejos futuros
- Conecta los desafíos financieros con soluciones de presupuesto
- Reconoce y valida el contexto cultural centroamericano

**Estilo de respuesta**:
- Confirma lo que entendiste del mensaje
- Haz máximo 2 preguntas: 1 técnica + 1 de conversación profunda
- Usa emojis ocasionalmente para ser amigable
- Sé empático y comprensivo con los desafíos financieros
- Sé conversacional, no robótico`;

    try {
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      const response = await getOpenAITextResponse(messages, {
        temperature: 0.7,
        maxTokens: 1024
      });

      return response.content;
    } catch (error) {
      console.error('Error generating Bussy response:', error);
      return this.getFallbackResponse(userMessage, context);
    }
  }

  /**
   * Fallback response when AI fails
   */
  private static getFallbackResponse(userMessage: string, context: ConversationContext): string {
    const currencySymbol = getCurrencySymbol(context.userCountry);

    if (context.conversationPhase === "discovery") {
      return `Entiendo que me estás contando sobre tus ingresos. ¿Podrías darme más detalles sobre cuánto recibes y con qué frecuencia? Por ejemplo, en ${currencySymbol}.`;
    } else if (context.conversationPhase === "details") {
      return `Perfecto, voy entendiendo mejor tu situación. ¿Hay algo más sobre tus ingresos que deba saber?`;
    } else {
      return `¡Excelente! Creo que ya tengo suficiente información. ¿Te parece que revisemos lo que configuraremos?`;
    }
  }

  /**
   * Parse income data using GPT-4o AI
   */
  static async parseIncomeDataWithAI(
    userMessage: string,
    context: ConversationContext
  ): Promise<IntelligentIncomeData[]> {
    const currencySymbol = getCurrencySymbol(context.userCountry);

    const extractionPrompt = `Extrae información de ingresos del siguiente mensaje del usuario. Devuelve solo un JSON válido con el siguiente formato:

{
  "sources": [
    {
      "name": "nombre descriptivo",
      "type": "salary|freelance|business|rental|remittance|other",
      "amount": número o null,
      "minAmount": número o null,
      "maxAmount": número o null,
      "frequency": "monthly|bi-weekly|weekly|project|seasonal|daily",
      "isVariable": boolean,
      "payDates": [números de días del mes] o null,
      "company": "nombre empresa" o null,
      "confidence": 0.0-1.0
    }
  ]
}

Mensaje del usuario: "${userMessage}"
País: ${context.userCountry}
Moneda: ${currencySymbol}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;

    try {
      const messages: AIMessage[] = [
        { role: 'user', content: extractionPrompt }
      ];

      const response = await getOpenAITextResponse(messages, {
        temperature: 0.1, // Low temperature for structured output
        maxTokens: 1024
      });

      const parsed = JSON.parse(response.content);
      return parsed.sources || [];
    } catch (error) {
      console.error('Error parsing income with AI:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Legacy method with AI enhancement
   */
  static async parseIncomeFromTextLegacy(
    userMessage: string,
    context: ConversationContext
  ): Promise<string> {
    try {
      // Use the AI parsing to extract data first
      const extractedData = await this.parseIncomeDataWithAI(userMessage, context);
      let response = "";

      // Acknowledgment of what was understood
      if (extractedData.length > 0) {
        const data = extractedData[0];
        const parts: string[] = [];
        const currencySymbol = getCurrencySymbol(context.userCountry);

        if (data.amount) {
          parts.push(`${currencySymbol}${data.amount.toLocaleString()}`);
        } else if (data.minAmount && data.maxAmount) {
          parts.push(`entre ${currencySymbol}${data.minAmount.toLocaleString()} y ${currencySymbol}${data.maxAmount.toLocaleString()}`);
        }

        if (data.frequency) {
          const freqText = {
            monthly: "mensual",
            "bi-weekly": "quincenal",
            weekly: "semanal",
            daily: "diario",
            project: "por proyecto",
            seasonal: "por temporadas"
          }[data.frequency] || data.frequency;
          parts.push(freqText);
        }

        if (data.type) {
          const typeText = {
            salary: "trabajo",
            freelance: "freelance",
            business: "negocio",
            rental: "renta",
            remittance: "remesas"
          }[data.type] || data.type;
          parts.push(`de ${typeText}`);
        }

        if (parts.length > 0) {
          response += `Entiendo, tienes ingresos ${parts.join(" ")}. `;
        }
      }

      // Generate follow-up response using AI
      const bussyResponse = await this.generateBussyResponse(userMessage, context);
      response += bussyResponse;

      return response;
    } catch (error) {
      console.error("Error in parseIncomeFromTextLegacy:", error);
      return "¿Puedes contarme más detalles sobre tus ingresos?";
    }
  }

  /**
   * Generate confirmation summary
   */
  private static generateConfirmationSummary(context: ConversationContext): string {
    let summary = "Perfecto! Déjame resumir lo que configuraremos:\n\n";

    context.collectedSources.forEach((source, index) => {
      summary += `${index + 1}. ${source.name || `Ingreso ${index + 1}`}:\n`;

      if (source.amount) {
        summary += `   • ${source.currency}${source.amount.toLocaleString()}`;
      } else if (source.minAmount && source.maxAmount) {
        summary += `   • Entre ${source.currency}${source.minAmount.toLocaleString()} y ${source.currency}${source.maxAmount.toLocaleString()}`;
      }

      if (source.frequency) {
        const freqMap = {
          monthly: "al mes",
          "bi-weekly": "quincenal",
          weekly: "semanal",
          project: "por proyecto"
        };
        summary += ` ${freqMap[source.frequency] || source.frequency}`;
      }
      summary += "\n";
    });

    summary += "\n¿Todo se ve correcto? ¿Hay algo que quieras ajustar?";
    return summary;
  }

  /**
   * Get default name for income type
   */
  private static getDefaultNameForType(type: string): string {
    const defaults = {
      salary: "Trabajo principal",
      freelance: "Trabajo freelance",
      business: "Negocio propio",
      rental: "Ingresos por renta",
      remittance: "Remesas familiares",
      other: "Otros ingresos"
    };
    return defaults[type as keyof typeof defaults] || "Ingreso";
  }
}