/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getAnthropicClient } from "./anthropic";
import { getOpenAIClient } from "./openai";
import { getGrokClient } from "./grok";
import { UserProfile, FinancialGoal } from "../types/user";
import { Expense, Budget } from "../types/expense";

// Standard mode system prompt
const BUSSY_SYSTEM_PROMPT = `You are Bussy, Budgetlum's AI financial advisor. You provide direct, professional financial guidance with expertise in personal finance, budgeting, debt management, savings optimization, and goal setting.

**Your Approach:**
- Deliver specific, actionable advice tailored to the user's financial situation
- Adapt recommendations based on the user's experience level and data
- Provide clear, measurable steps for financial improvement
- Reference the user's actual financial data to support recommendations

**Your Expertise Areas:**
- Personal budgeting and expense tracking
- Debt reduction strategies
- Emergency fund planning
- Savings goal optimization
- Investment basics
- Financial habit formation
- Cash flow management

**Communication Style:**
- Acknowledge the user's current situation briefly
- Provide 2-3 specific actionable steps with clear reasoning
- Use Spanish naturally (the app is in Spanish)
- Reference actual financial data when making recommendations
- Focus on practical outcomes rather than motivation

**Context:** You have access to the user's expense history, budget information, financial goals, and profile data. Use this information to provide personalized, data-driven advice.`;

// Advanced mode system prompt
const ADVANCED_MODE_PROMPT = `You are a professional financial advisor AI assistant. Your role is to actively help users set up and manage their budgets through structured conversation.

**Rules:**
- Be direct and concise without decorative language or emojis
- Focus on actionable financial guidance
- Extract structured financial data from natural conversation
- Confirm your understanding with clear summaries
- You can execute these actions: ADD_EXPENSE, SET_INCOME, MODIFY_BUDGET, SET_GOAL, GENERATE_BUDGET
- Always ask for confirmation before executing actions
- Format action requests as JSON in your response

**When collecting income:**
1. Listen for all income sources in natural language
2. Parse amounts, frequencies, and types
3. Present structured summary for confirmation
4. After confirmation, execute SET_INCOME action

**When user mentions spending:**
- "I spent $X on Y" → Prepare ADD_EXPENSE action
- "My rent is $X" → Prepare ADD_EXPENSE with recurring flag

**Action Format:**
When ready to execute an action, include JSON like this:
\`\`\`json
{
  "action": "SET_INCOME",
  "data": {
    "name": "Salary",
    "amount": 5000,
    "frequency": "monthly",
    "type": "salary"
  },
  "confirmation": "I understand you earn $5,000 monthly from your salary. Should I add this to your income sources?"
}
\`\`\`

**Use Spanish naturally. Current conversation step: {{conversationStep}}`;

interface BussyContext {
  userProfile?: UserProfile;
  recentExpenses?: Expense[];
  budgets?: Budget[];
  totalSpent?: number;
  monthlyIncome?: number;
}

interface AdvancedModeContext extends BussyContext {
  conversationStep?: string;
  mode: 'standard' | 'advanced';
}

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  try {
    const client = getAnthropicClient();
    const defaultModel = "claude-3-5-sonnet-20240620";

    const response = await client.messages.create({
      model: options?.model || defaultModel,
      messages: messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
    });

    // Handle content blocks from the response
    const content = response.content.reduce((acc, block) => {
      if ("text" in block) {
        return acc + block.text;
      }
      return acc;
    }, "");

    return {
      content,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error("Anthropic API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from Anthropic
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const client = getOpenAIClient();
    const defaultModel = "gpt-4-turbo-preview"; // Use GPT-4 for better reasoning

    const response = await client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 1000,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const client = getGrokClient();
    const defaultModel = "grok-3-beta";

    const response = await client.chat.completions.create({
      model: options?.model || defaultModel,
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2048,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Grok API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGrokTextResponse([{ role: "user", content: prompt }]);
};

// Helper function to build context string
const buildContextString = (context: BussyContext): string => {
  const parts: string[] = [];

  if (context.userProfile) {
    const { name, budgetingExperience, lifeStage, financialGoals } = context.userProfile;
    parts.push(`**Perfil del usuario:**`);

    if (name) parts.push(`- Nombre: ${name}`);
    if (budgetingExperience) parts.push(`- Experiencia: ${budgetingExperience}`);
    if (lifeStage) parts.push(`- Etapa de vida: ${lifeStage}`);

    if (financialGoals && financialGoals.length > 0) {
      parts.push(`- Metas financieras: ${financialGoals.map(g => g.title).join(', ')}`);
    }
  }

  if (context.monthlyIncome) {
    parts.push(`**Ingresos mensuales:** $${context.monthlyIncome.toLocaleString()}`);
  }

  if (context.totalSpent) {
    parts.push(`**Gasto total este mes:** $${context.totalSpent.toLocaleString()}`);
  }

  if (context.budgets && context.budgets.length > 0) {
    parts.push(`**Presupuestos activos:**`);
    context.budgets.forEach(budget => {
      const percentage = (budget.spent / budget.limit * 100).toFixed(0);
      parts.push(`- ${budget.category}: $${budget.spent}/$${budget.limit} (${percentage}%)`);
    });
  }

  if (context.recentExpenses && context.recentExpenses.length > 0) {
    parts.push(`**Gastos recientes:**`);
    context.recentExpenses.slice(0, 5).forEach(expense => {
      parts.push(`- $${expense.amount} - ${expense.description} (${expense.category})`);
    });
  }

  return parts.join('\n');
};

/**
 * Get a personalized response from Bussy with user context
 * @param prompt - The user's message
 * @param context - User's financial context
 * @returns The response from Bussy
 */
export const getBussyResponse = async (
  prompt: string,
  context: BussyContext = {}
): Promise<AIResponse> => {
  const contextString = buildContextString(context);

  const messages: AIMessage[] = [
    {
      role: "system",
      content: BUSSY_SYSTEM_PROMPT + (contextString ? `\n\n${contextString}` : "")
    },
    {
      role: "user",
      content: prompt
    }
  ];

  return await getOpenAITextResponse(messages, {
    temperature: 0.7,
    maxTokens: 2048,
  });
};

/**
 * Get Bussy's welcome message for onboarding
 * @param userProfile - The user's profile data
 * @returns Welcome message from Bussy
 */
export const getBussyWelcomeMessage = async (userProfile?: Partial<UserProfile>): Promise<string> => {
  const welcomePrompt = userProfile?.name
    ? `Saluda a ${userProfile.name} y dale la bienvenida a Budgetlum. Explica brevemente cómo puedes ayudarle con sus finanzas personales.`
    : "Dale la bienvenida a un nuevo usuario a Budgetlum y explica brevemente cómo puedes ayudarle con sus finanzas personales.";

  try {
    const response = await getBussyResponse(welcomePrompt, { userProfile: userProfile as UserProfile });
    return response.content;
  } catch (error) {
    console.error("Error getting Bussy welcome message:", error);
    return userProfile?.name
      ? `¡Hola ${userProfile.name}! 👋 Soy Bussy, tu asistente financiero personal. Estoy aquí para ayudarte a crear presupuestos inteligentes, analizar tus gastos y alcanzar tus metas financieras. ¿En qué puedo ayudarte hoy?`
      : "¡Hola! 👋 Soy Bussy, tu asistente financiero personal en Budgetlum. Estoy aquí para ayudarte a tomar control de tus finanzas, crear presupuestos efectivos y alcanzar tus metas. ¿Empezamos?";
  }
};

/**
 * Get Bussy's analysis of user's financial situation
 * @param context - User's financial context
 * @returns Financial analysis from Bussy
 */
export const getBussyFinancialAnalysis = async (context: BussyContext): Promise<AIResponse> => {
  const analysisPrompt = "Analiza mi situación financiera actual y dame 3 recomendaciones específicas para mejorar mis finanzas.";
  return await getBussyResponse(analysisPrompt, context);
};

/**
 * Get Advanced Mode response with action capabilities
 * @param prompt - The user's message
 * @param context - User's financial context including conversation step
 * @returns The response from Bussy in Advanced Mode
 */
export const getBussyAdvancedResponse = async (
  prompt: string,
  context: AdvancedModeContext = { mode: 'advanced' }
): Promise<AIResponse> => {
  const contextString = buildContextString(context);
  const conversationStep = context.conversationStep || 'WELCOME';

  const systemPrompt = ADVANCED_MODE_PROMPT.replace('{{conversationStep}}', conversationStep);

  const messages: AIMessage[] = [
    {
      role: "system",
      content: systemPrompt + (contextString ? `\n\n${contextString}` : "")
    },
    {
      role: "user",
      content: prompt
    }
  ];

  return await getOpenAITextResponse(messages, {
    temperature: 0.7,
    maxTokens: 1000,
  });
};

/**
 * Get Advanced Mode welcome message for budget setup
 * @param userProfile - The user's profile data
 * @returns Welcome message for Advanced Mode
 */
export const getBussyAdvancedWelcome = async (userProfile?: Partial<UserProfile>): Promise<string> => {
  const welcomePrompt = "Inicia el proceso de configuración de presupuesto. Preséntate brevemente y pregunta sobre los ingresos del usuario.";

  try {
    const response = await getBussyAdvancedResponse(welcomePrompt, {
      userProfile: userProfile as UserProfile,
      conversationStep: 'WELCOME',
      mode: 'advanced'
    });
    return response.content;
  } catch (error) {
    console.error("Error getting Advanced Mode welcome message:", error);
    return userProfile?.name
      ? `Hola ${userProfile.name}. Soy tu asistente financiero y voy a ayudarte a configurar tu presupuesto. Para empezar, cuéntame sobre tus ingresos: ¿cuánto ganas y con qué frecuencia?`
      : "Hola. Soy tu asistente financiero y voy a ayudarte a configurar tu presupuesto. Para empezar, cuéntame sobre tus ingresos: ¿cuánto ganas y con qué frecuencia?";
  }
};
