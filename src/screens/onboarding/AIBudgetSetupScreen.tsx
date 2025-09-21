import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import AnimatedPressable from "../../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCurrencySymbol } from "../../types/centralAmerica";
import { DataCollectionService, CollectedUserData } from "../../services/dataCollectionService";
import { useAIChat, ChatMessage } from "../../contexts/AIChatContext";
import { ChatQuickActions, QuickAction } from "../../components/onboarding/ChatQuickActions";
import { ValidationSummaryCard } from "../../components/onboarding/ValidationSummaryCard";
import { ChatProgressIndicator } from "../../components/onboarding/ChatProgressIndicator";
import { ParsedIncome } from "../../utils/incomeParser";
import { FinancialGoal } from "../../types/user";

type AIBudgetSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "AIBudgetSetup">;

type ConversationPhase = "introduction" | "categories" | "details" | "confirmation";

interface BudgetDetection {
  category: string;
  amount?: number;
  priority?: "essential" | "important" | "optional";
  frequency?: string;
  reasoning?: string;
}

interface SystemPromptParams {
  userInput: string;
  currencySymbol: string;
  userData: CollectedUserData | null;
  conversationPhase: ConversationPhase;
  budgetHighlights: BudgetDetection[];
  detectedIncomes: ParsedIncome[];
  detectedGoals: Partial<FinancialGoal>[];
}

const buildSystemPrompt = ({
  userInput,
  currencySymbol,
  userData,
  conversationPhase,
  budgetHighlights,
  detectedIncomes,
  detectedGoals,
}: SystemPromptParams) => {
  const incomeLine = userData?.monthlyIncome
    ? `${currencySymbol}${userData.monthlyIncome.toLocaleString()} (${userData?.incomeStability || "desconocida"})`
    : "desconocido";

  const budgetLines = budgetHighlights.length
    ? budgetHighlights
        .map((item) => {
          const amountLabel = item.amount
            ? `${currencySymbol}${item.amount.toLocaleString()}`
            : "monto por definir";
          const priorityLabel = item.priority ? ` (${item.priority})` : "";
          return `- ${item.category}: ${amountLabel}${priorityLabel}`;
        })
        .join("\n")
    : "- Aún no tenemos categorías confirmadas";

  const incomeLines = detectedIncomes.length
    ? detectedIncomes
        .map(
          (income) =>
            `- ${income.name || "Ingreso"}: ${currencySymbol}${income.amount.toLocaleString()} (${income.frequency})`
        )
        .join("\n")
    : "- Sin ingresos confirmados";

  const goalLines = detectedGoals.length
    ? detectedGoals
        .map((goal) => `- ${goal.title || "Meta"}: ${currencySymbol}${goal.targetAmount?.toLocaleString()}`)
        .join("\n")
    : "- Sin metas confirmadas";

  return `Eres Bussy, el asistente financiero cálido y culturalmente consciente de Budgetlum. Estás ayudando al usuario a construir su presupuesto durante el onboarding.

FASE ACTUAL: ${conversationPhase.toUpperCase()}
MENSAJE DEL USUARIO: "${userInput}"

Contexto del usuario:
- Ingreso mensual estimado: ${incomeLine}
- País: ${userData?.country || "GT"}
- Estilo recomendado: ${userData?.budgetingStyle || "moderado"}

Datos sincronizados hasta ahora:
Ingresos detectados:
${incomeLines}

Categorías de presupuesto detectadas:
${budgetLines}

Metas mencionadas:
${goalLines}

Instrucciones clave:
1. Responde en español latino y tono empático.
2. Confirma específicamente la información que el usuario entrega y cómo se incorporará al presupuesto.
3. Propón máximo dos preguntas claras para avanzar en la fase actual.
4. Si detectas montos o fechas, verifica visualmente con el usuario.
5. Ofrece sugerencias culturales relevantes (remesas, celebraciones, transporte) cuando aplique.
6. Cuando la información sea suficiente para cerrar la fase, sugiere el siguiente paso de forma clara.

Nunca inventes datos. Si algo no está claro, pide confirmación. Mantén las respuestas concisas (máximo 4 párrafos cortos).`;
};

interface QuickActionBlueprint {
  id: string;
  label: string;
  buildPayload: (currencySymbol: string) => string;
}

const QUICK_ACTION_BLUEPRINTS: QuickActionBlueprint[] = [
  {
    id: "rent",
    label: "Renta Mensual",
    buildPayload: (currency) => `Pago ${currency}2500 de renta cada mes`,
  },
  {
    id: "groceries",
    label: "Supermercado",
    buildPayload: (currency) => `Gasto unos ${currency}1400 en comida para la casa`,
  },
  {
    id: "transport",
    label: "Transporte",
    buildPayload: (currency) => `Entre gasolina y transporte se van ${currency}600 al mes`,
  },
  {
    id: "family",
    label: "Apoyo familiar",
    buildPayload: (currency) => `Apoyo a mi familia con ${currency}800 cada mes`,
  },
];

export default function AIBudgetSetupScreen() {
  const navigation = useNavigation<AIBudgetSetupNavigationProp>();
  const {
    messages,
    isTyping,
    lastExtraction,
    validation,
    syncSummary,
    sendUserMessage,
    configureSession,
    resetConversation,
  } = useAIChat();

  const { incomes, profile, setOnboardingStep, updateProfile, createBudget } = useUserStore((state) => ({
    incomes: state.incomes,
    profile: state.userProfile,
    setOnboardingStep: state.setOnboardingStep,
    updateProfile: state.updateProfile,
    createBudget: state.createBudget,
  }));

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [currentInput, setCurrentInput] = useState("");
  const [introMessage, setIntroMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<CollectedUserData | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("introduction");
  const [budgetHighlights, setBudgetHighlights] = useState<BudgetDetection[]>([]);
  const [detectedIncomes, setDetectedIncomes] = useState<ParsedIncome[]>([]);
  const [detectedGoals, setDetectedGoals] = useState<Partial<FinancialGoal>[]>([]);

  const currencySymbol = getCurrencySymbol(profile?.country || "GT");

  const quickActions = useMemo<QuickAction[]>(
    () =>
      QUICK_ACTION_BLUEPRINTS.map(({ id, label, buildPayload }) => ({
        id,
        label,
        payload: buildPayload(currencySymbol),
      })),
    [currencySymbol]
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const resetLocalState = useCallback(() => {
    setBudgetHighlights([]);
    setDetectedIncomes([]);
    setDetectedGoals([]);
    setCurrentInput("");
  }, []);

  const initializeBudgetConversation = useCallback(async () => {
    try {
      resetConversation();
      resetLocalState();
      setIntroMessage(null);
      setConversationPhase("introduction");

      const compiledData = DataCollectionService.compileUserData(
        incomes.map((income) => ({
          name: income.name,
          type: income.type,
          amount: income.amount,
          minAmount: income.minAmount,
          maxAmount: income.maxAmount,
          frequency: income.frequency,
          isVariable: income.isVariable,
          confidence: 1.0,
        })),
        [],
        profile?.country || "GT",
        "advanced"
      );

      setUserData(compiledData);

      const personalizedSummary = await DataCollectionService.createPersonalizedSummary(compiledData);
      setIntroMessage(
        `${personalizedSummary}

¡Ahora viene la parte emocionante! 🎉 Vamos a crear tu presupuesto personalizado que realmente funcione para TU vida específica.

No te preocupes si nunca has hecho un presupuesto antes - yo te voy a guiar paso a paso de manera súper natural. Solo cuéntame como si le hablaras a un amigo 😊

🤔 **Para empezar, me encantaría conocer:**

💰 ¿En qué se te va principalmente el dinero cada mes?
🏠 ¿Tienes gastos que SIEMPRE tienes que pagar?
❤️ ¿Hay algo especial en lo que te gusta invertir?

**Cuéntame lo que se te ocurra** - pueden ser números exactos, estimaciones, o solo categorías. ¡Todo me sirve para ayudarte! 🚀`
      );

      configureSession({
        systemPrompt: buildSystemPrompt({
          userInput: "",
          currencySymbol,
          userData: compiledData,
          conversationPhase: "categories",
          budgetHighlights: [],
          detectedIncomes: [],
          detectedGoals: [],
        }),
        context: {
          userData: compiledData,
          conversationPhase: "categories",
        },
        temperature: 0.7,
        maxTokens: 1024,
      });

      setConversationPhase("categories");
    } catch (error) {
      console.error("Error initializing budget conversation:", error);
      setIntroMessage(`¡Excelente! 🎉 Ahora vamos a crear tu presupuesto personalizado basado en tus ingresos de ${currencySymbol}${(profile?.primaryIncome || 0).toLocaleString()}.

🤗 Háblame como si fuera tu amigo financiero: ¿en qué se te va el dinero principalmente cada mes? Puede ser alimentación, casa, transporte, familia, diversión... ¡lo que sea!`);
      configureSession({
        systemPrompt: buildSystemPrompt({
          userInput: "",
          currencySymbol,
          userData: null,
          conversationPhase: "categories",
          budgetHighlights: [],
          detectedIncomes: [],
          detectedGoals: [],
        }),
      });
    }
  }, [configureSession, currencySymbol, incomes, profile, resetConversation, resetLocalState]);

  useEffect(() => {
    initializeBudgetConversation();
    return () => resetConversation();
  }, [initializeBudgetConversation, resetConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, introMessage, scrollToBottom]);

  useEffect(() => {
    if (!lastExtraction) return;

    if (lastExtraction.incomes.length > 0) {
      setDetectedIncomes((prev) => {
        const combined = [...prev];
        lastExtraction.incomes.forEach((income) => {
          const index = combined.findIndex(
            (item) => item.frequency === income.frequency && item.type === income.type
          );
          if (index >= 0) {
            combined[index] = { ...combined[index], ...income };
          } else {
            combined.push(income);
          }
        });
        return combined;
      });
    }

    if (lastExtraction.goals.length > 0) {
      setDetectedGoals((prev) => {
        const next = [...prev];
        lastExtraction.goals.forEach((goal) => {
          if (!goal.title) return;
          const index = next.findIndex(
            (existing) => existing.title?.toLowerCase() === goal.title?.toLowerCase()
          );
          if (index >= 0) {
            next[index] = { ...next[index], ...goal };
          } else {
            next.push(goal);
          }
        });
        return next;
      });
    }

    if (lastExtraction.expenses.length > 0) {
      setBudgetHighlights((prev) => {
        const updated = [...prev];
        lastExtraction.expenses.forEach((expense) => {
          if (!expense.category) return;
          const index = updated.findIndex(
            (item) => item.category.toLowerCase() === expense.category.toLowerCase()
          );

          const nextEntry: BudgetDetection = {
            category: expense.category,
            amount: Number.isFinite(expense.amount) ? expense.amount : undefined,
            priority: index >= 0 ? updated[index].priority : undefined,
            frequency: expense.frequency,
            reasoning: expense.description,
          };

          if (index >= 0) {
            updated[index] = { ...updated[index], ...nextEntry };
          } else {
            updated.push(nextEntry);
          }
        });
        return updated;
      });
    }

    if (lastExtraction.preferences?.paymentDates?.length) {
      updateProfile({ paymentDates: lastExtraction.preferences.paymentDates });
    }
  }, [lastExtraction, updateProfile]);

  useEffect(() => {
    if (!syncSummary) return;
    const affected = syncSummary.incomesCreated + syncSummary.incomesUpdated;
    if (affected === 0) return;

    const state = useUserStore.getState();
    const compiledData = DataCollectionService.compileUserData(
      state.incomes.map((income) => ({
        name: income.name,
        type: income.type,
        amount: income.amount,
        minAmount: income.minAmount,
        maxAmount: income.maxAmount,
        frequency: income.frequency,
        isVariable: income.isVariable,
        confidence: 1.0,
      })),
      [],
      state.userProfile.country || "GT",
      "advanced"
    );
    setUserData(compiledData);
  }, [syncSummary]);

  useEffect(() => {
    if (budgetHighlights.length === 0) {
      setConversationPhase("categories");
    } else if (budgetHighlights.length >= 3 && detectedIncomes.length > 0) {
      setConversationPhase("confirmation");
    } else {
      setConversationPhase("details");
    }
  }, [budgetHighlights, detectedIncomes]);

  const renderMessage = (message: ChatMessage) => {
    const isAssistant = message.role === "assistant";

    return (
      <View key={message.id} className={`mb-1 ${isAssistant ? "items-start" : "items-end"}`}>
        <View
          className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
            isAssistant
              ? "bg-blue-100 border border-blue-200 rounded-bl-md"
              : "bg-green-100 border border-green-200 rounded-br-md"
          }`}
        >
          {isAssistant && (
            <View className="flex-row items-center mb-2">
              <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">B</Text>
              </View>
              <Text className="text-blue-800 font-medium text-sm">Bussy AI - Presupuesto</Text>
            </View>
          )}

          <Text className={`text-sm leading-snug ${isAssistant ? "text-blue-900" : "text-green-900"}`}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const conversationSteps = useMemo(() => [
    { id: "categories", label: "Gastos", status: budgetHighlights.length > 0 ? "complete" : "current" },
    {
      id: "details",
      label: "Detalles",
      status:
        budgetHighlights.length > 0 && conversationPhase !== "categories"
          ? conversationPhase === "details"
            ? "current"
            : "complete"
          : "upcoming",
    },
    {
      id: "confirmation",
      label: "Confirmación",
      status: conversationPhase === "confirmation" ? "current" : "upcoming",
    },
  ], [budgetHighlights.length, conversationPhase]);

  const handleQuickAction = (payload: string) => {
    setCurrentInput(payload);
    Keyboard.dismiss();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isTyping) return;

    const message = currentInput.trim();
    setCurrentInput("");

    const prompt = buildSystemPrompt({
      userInput: message,
      currencySymbol,
      userData,
      conversationPhase,
      budgetHighlights,
      detectedIncomes,
      detectedGoals,
    });

    await sendUserMessage(message, {
      systemPrompt: prompt,
      context: {
        userData,
        conversationPhase,
        budgetHighlights,
        detectedIncomes,
        detectedGoals,
      },
    });

    scrollToBottom();
  };

  const handleFinishBudgetSetup = useCallback(async () => {
    try {
      if (!userData) return;

      const budgetSuggestions = await DataCollectionService.generateBudgetSuggestions(userData);

      const finalBudgetSuggestions = budgetSuggestions.map((suggestion) => {
        const extracted = budgetHighlights.find(
          (item) => item.category.toLowerCase() === suggestion.category.toLowerCase()
        );

        return {
          ...suggestion,
          suggestedAmount: extracted?.amount || suggestion.suggestedAmount,
        };
      });

      const budgetCategories = finalBudgetSuggestions.map((suggestion) => ({
        name: suggestion.category,
        limit: suggestion.suggestedAmount,
        spent: 0,
        priority: suggestion.priority,
        reasoning: suggestion.reasoning,
        isActive: true,
        period: "monthly" as const,
      }));

      const totalLimit = budgetCategories.reduce((sum, cat) => sum + cat.limit, 0);

      const budget = {
        name: "Mi Presupuesto con Bussy",
        categories: budgetCategories,
        totalLimit,
        totalSpent: 0,
        period: "monthly" as const,
        isActive: true,
      };

      createBudget(budget);

      updateProfile({
        hasSetupBudget: true,
        budgetSetupMethod: "ai",
      });

      setOnboardingStep(5);
      navigation.navigate("Goals");
    } catch (error) {
      console.error("Error finishing budget setup:", error);
    }
  }, [budgetHighlights, createBudget, navigation, setOnboardingStep, updateProfile, userData]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(5);
    navigation.navigate("Goals");
  };

  const aggregatedPaymentDates = useMemo(() => {
    const dates = new Set<number>();
    if (profile?.paymentDates?.length) {
      profile.paymentDates.forEach((date) => dates.add(date));
    }
    if (lastExtraction?.preferences?.paymentDates?.length) {
      lastExtraction.preferences.paymentDates.forEach((date) => dates.add(date));
    }
    return Array.from(dates).sort((a, b) => a - b);
  }, [lastExtraction, profile]);

  const canFinish = budgetHighlights.length >= 3 && conversationPhase === "confirmation";

  return (
    <OnboardingContainer
      title="Presupuesto con Bussy AI"
      subtitle="Tu asistente inteligente para crear presupuestos personalizados"
      currentStep={4}
      totalSteps={6}
      onBack={handleBack}
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        <ChatProgressIndicator steps={conversationSteps} />

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 mb-3 px-3"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        >
          {introMessage && (
            <View className="mb-3 items-start">
              <View className="bg-blue-100 border border-blue-200 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                    <Text className="text-white text-xs font-bold">B</Text>
                  </View>
                  <Text className="text-blue-800 font-medium text-sm">Bussy AI - Presupuesto</Text>
                </View>
                <Text className="text-sm text-blue-900 leading-snug">{introMessage}</Text>
              </View>
            </View>
          )}

          {messages.map(renderMessage)}

          {isTyping && (
            <View className="items-start mb-1">
              <View className="bg-blue-100 border border-blue-200 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                    <Text className="text-white text-xs font-bold">B</Text>
                  </View>
                  <Text className="text-blue-800 font-medium text-sm mr-2">Bussy está analizando</Text>
                  <View className="flex-row space-x-1">
                    <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <View
                      className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" } as any}
                    />
                    <View
                      className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" } as any}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {validation && (
            <ValidationSummaryCard validation={validation} syncSummary={syncSummary} />
          )}

          {(budgetHighlights.length > 0 || detectedIncomes.length > 0) && (
            <View className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <Text className="text-green-800 font-medium mb-2">📊 Datos detectados:</Text>

              {detectedIncomes.length > 0 && (
                <View className="mb-3">
                  <Text className="text-green-700 font-semibold mb-2">Ingresos:</Text>
                  {detectedIncomes.map((income, index) => (
                    <Text key={`${income.name}-${index}`} className="text-green-700 text-sm">
                      • {income.name || "Ingreso"}: {currencySymbol}{income.amount.toLocaleString()} ({income.frequency})
                    </Text>
                  ))}
                </View>
              )}

              {budgetHighlights.length > 0 && (
                <View>
                  <Text className="text-green-700 font-semibold mb-2">Categorías de presupuesto:</Text>
                  {budgetHighlights.map((item, index) => (
                    <View key={`${item.category}-${index}`} className="flex-row items-center justify-between py-1">
                      <Text className="text-green-700 text-sm flex-1">• {item.category}</Text>
                      <Text className="text-green-600 text-xs">
                        {item.amount ? `${currencySymbol}${item.amount.toLocaleString()}` : "Por definir"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {aggregatedPaymentDates.length > 0 && (
                <View className="mt-3">
                  <Text className="text-green-700 font-semibold mb-1">Fechas de pago:</Text>
                  <Text className="text-green-600 text-sm">{aggregatedPaymentDates.join(", ")}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <ChatQuickActions actions={quickActions} onSelect={handleQuickAction} disabled={isTyping} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View className="flex-row items-end space-x-3 p-4 bg-gray-50 rounded-xl mt-3">
            <TextInput
              ref={inputRef}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 max-h-24"
              placeholder="Cuéntame sobre tus gastos..."
              placeholderTextColor="#9CA3AF"
              value={currentInput}
              onChangeText={setCurrentInput}
              multiline
              textAlignVertical="top"
              onSubmitEditing={handleSendMessage}
              editable={!isTyping}
              onFocus={scrollToBottom}
            />

            <AnimatedPressable
              onPress={handleSendMessage}
              disabled={!currentInput.trim() || isTyping}
              className={`p-3 rounded-xl ${currentInput.trim() && !isTyping ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <Ionicons
                name="send"
                size={20}
                color={currentInput.trim() && !isTyping ? "white" : "#9CA3AF"}
              />
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>

        {canFinish && (
          <View className="mt-4">
            <AnimatedPressable onPress={handleFinishBudgetSetup} className="bg-green-600 rounded-xl py-4 items-center">
              <Text className="text-white font-semibold text-lg">Finalizar presupuesto</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}
