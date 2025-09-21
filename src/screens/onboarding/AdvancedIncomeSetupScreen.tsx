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
import { useAIChat, ChatMessage } from "../../contexts/AIChatContext";
import { ChatQuickActions, QuickAction } from "../../components/onboarding/ChatQuickActions";
import { ValidationSummaryCard } from "../../components/onboarding/ValidationSummaryCard";
import { ChatProgressIndicator } from "../../components/onboarding/ChatProgressIndicator";
import { ParsedIncome } from "../../utils/incomeParser";
import { IncomeSource, UserProfile } from "../../types/user";

const INTRO_MESSAGE = `¡Hola! 👋 Soy Bussy, tu asistente financiero personal.

Estoy aquí para ayudarte a configurar tus ingresos de manera súper fácil y personalizada. Aunque tengas una situación compleja, la organizamos juntos. Solo cuéntame como lo harías con un amigo 😊

💡 Para empezar podrías contarme:
• ¿De dónde viene tu dinero principal?
• ¿Hay ingresos extra como freelancing, remesas o negocios?
• ¿En qué fechas te pagan?

Mientras más detalles me des (montos, frecuencia, días de pago) mejor podré armarte todo. ¡Vamos paso a paso! 🚀`;

type AdvancedIncomeSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "AdvancedIncomeSetup">;

type IncomeConversationPhase = "discovery" | "amounts" | "schedule" | "confirmation";
type StepStatus = "complete" | "current" | "upcoming";

interface ConversationStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface IncomePromptParams {
  userInput: string;
  currencySymbol: string;
  profile: UserProfile | null;
  detectedIncomes: ParsedIncome[];
  existingIncomes: IncomeSource[];
  conversationPhase: IncomeConversationPhase;
  paymentDates: number[];
}

const buildIncomeSystemPrompt = ({
  userInput,
  currencySymbol,
  profile,
  detectedIncomes,
  existingIncomes,
  conversationPhase,
  paymentDates,
}: IncomePromptParams) => {
  const existingLines = existingIncomes.length
    ? existingIncomes
        .map(
          (income) =>
            `- ${income.name}: ${currencySymbol}${income.amount.toLocaleString()} (${income.frequency})${
              income.payDate ? `, pagado el día ${income.payDate}` : ""
            }`
        )
        .join("\n")
    : "- Sin registros previos";

  const detectedLines = detectedIncomes.length
    ? detectedIncomes
        .map((income) => {
          const amountLabel = Number.isFinite(income.amount)
            ? `${currencySymbol}${income.amount.toLocaleString()}`
            : income.minAmount && income.maxAmount
              ? `${currencySymbol}${income.minAmount.toLocaleString()} - ${currencySymbol}${income.maxAmount.toLocaleString()}`
              : "monto por confirmar";
          const schedule = income.paymentDates?.length
            ? ` | Fechas: ${income.paymentDates.join(", ")}`
            : "";
          return `- ${income.name || "Ingreso"}: ${amountLabel} (${income.frequency})${schedule}`;
        })
        .join("\n")
    : "- Aún no hemos confirmado montos";

  const paymentDatesLine = paymentDates.length
    ? paymentDates
        .sort((a, b) => a - b)
        .map((day) => `día ${day}`)
        .join(", ")
    : "sin confirmar";

  return `Eres Bussy, el asistente financiero cercano y culturalmente consciente de Budgetlum. Estás guiando el onboarding en el paso de ingresos avanzados.

FASE ACTUAL: ${conversationPhase.toUpperCase()}
MENSAJE DEL USUARIO: "${userInput}"

Perfil del usuario:
- País: ${profile?.country || "GT"}
- Etapa de vida: ${profile?.lifeStage || "desconocida"}
- Experiencia con presupuesto: ${profile?.budgetingExperience || "desconocida"}

Ingresos registrados previamente:
${existingLines}

Datos detectados en esta sesión:
${detectedLines}

Fechas de pago conocidas: ${paymentDatesLine}

Instrucciones clave:
1. Responde en español latino, tono empático y claro.
2. Repite y valida explícitamente montos, frecuencias y fechas que el usuario mencione.
3. Si falta información (monto, frecuencia, fechas) pide solo lo necesario sin entrar en bucles interminables.
4. Cuando detectes nuevos datos, explica cómo se actualizará el panel visual.
5. No inventes números. Si algo es confuso, pide confirmación o rango.
6. Cuando todo esté claro (montos y calendario), guía al usuario a continuar al siguiente paso.`;
};

interface QuickActionBlueprint {
  id: string;
  label: string;
  buildPayload: (currencySymbol: string) => string;
}

const QUICK_ACTION_BLUEPRINTS: QuickActionBlueprint[] = [
  {
    id: "salary",
    label: "Salario quincenal",
    buildPayload: (currency) => `Trabajo en oficina y gano ${currency}4500 al mes, me pagan el 15 y 30`,
  },
  {
    id: "freelance",
    label: "Ingresos freelance",
    buildPayload: (currency) => `Además hago trabajos freelance, me caen como ${currency}1200 cada mes pero varía`,
  },
  {
    id: "remittance",
    label: "Remesas",
    buildPayload: (currency) => `Recibo remesas de mi hermano, son ${currency}800 el primer domingo de cada mes`,
  },
  {
    id: "business",
    label: "Negocio propio",
    buildPayload: (currency) => `Tengo un pequeño negocio y limpio ${currency}2000 al mes, suele entrar entre el 10 y 12`,
  },
];

const normalizeIncomeFrequency = (frequency: IncomeSource["frequency"]): ParsedIncome["frequency"] => {
  switch (frequency) {
    case "project":
    case "seasonal":
      return "irregular";
    default:
      return frequency as ParsedIncome["frequency"];
  }
};

const mapIncomeToParsed = (income: IncomeSource): ParsedIncome => ({
  name: income.name,
  type: income.type,
  amount: income.amount,
  minAmount: income.minAmount,
  maxAmount: income.maxAmount,
  frequency: normalizeIncomeFrequency(income.frequency),
  isVariable: income.isVariable,
  paymentDates:
    income.paymentSchedule?.dates && income.paymentSchedule.dates.length > 0
      ? income.paymentSchedule.dates
      : typeof income.payDate === "number" && income.payDate > 0
        ? [income.payDate]
        : undefined,
  description: income.description,
  confidence: 1,
});

export default function AdvancedIncomeSetupScreen() {
  const navigation = useNavigation<AdvancedIncomeSetupNavigationProp>();
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

  const { incomes, profile, setOnboardingStep, updateProfile, addIncome } = useUserStore((state) => ({
    incomes: state.incomes,
    profile: state.userProfile,
    setOnboardingStep: state.setOnboardingStep,
    updateProfile: state.updateProfile,
    addIncome: state.addIncome,
  }));

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [currentInput, setCurrentInput] = useState("");
  const [introMessage, setIntroMessage] = useState<string | null>(null);
  const [conversationPhase, setConversationPhase] = useState<IncomeConversationPhase>("discovery");
  const [detectedIncomes, setDetectedIncomes] = useState<ParsedIncome[]>([]);

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

  const initialIncomesRef = useRef(incomes);
  const initialProfileRef = useRef(profile);
  const initialCurrencyRef = useRef(currencySymbol);

  useEffect(() => {
    const initialIncomes = initialIncomesRef.current;
    const initialProfile = initialProfileRef.current;
    const symbol = initialCurrencyRef.current;

    resetConversation();
    setIntroMessage(INTRO_MESSAGE);
    setDetectedIncomes(initialIncomes.map(mapIncomeToParsed));
    setCurrentInput("");
    setConversationPhase("discovery");

    const existingPaymentDates = [
      ...initialIncomes.flatMap((income) => income.paymentSchedule?.dates || []),
      ...(initialProfile?.paymentDates || []),
    ].filter((day): day is number => typeof day === "number");

    configureSession({
      systemPrompt: buildIncomeSystemPrompt({
        userInput: "",
        currencySymbol: symbol,
        profile: initialProfile || null,
        detectedIncomes: initialIncomes.map(mapIncomeToParsed),
        existingIncomes: initialIncomes,
        conversationPhase: "discovery",
        paymentDates: existingPaymentDates,
      }),
      context: {
        existingIncomes: initialIncomes,
        profile: initialProfile,
        conversationPhase: "discovery",
        paymentDates: existingPaymentDates,
      },
      temperature: 0.65,
      maxTokens: 900,
    });

    return () => {
      resetConversation();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, introMessage]);

  useEffect(() => {
    if (!lastExtraction) return;

    if (lastExtraction.incomes.length > 0) {
      setDetectedIncomes((prev) => {
        const combined = [...prev];
        lastExtraction.incomes.forEach((income) => {
          const normalizedName = income.name?.toLowerCase();
          const index = combined.findIndex((item) => {
            if (normalizedName && item.name?.toLowerCase() === normalizedName) {
              return true;
            }
            return item.type === income.type && item.frequency === income.frequency;
          });

          const previousAmount = index >= 0 ? combined[index]?.amount : undefined;
          const cleanedAmount = resolveIncomeAmount(income, previousAmount);
          const mergedPaymentDates = mergePaymentDates(
            index >= 0 ? combined[index]?.paymentDates : undefined,
            income.paymentDates
          );

          const nextIncome: ParsedIncome = {
            ...combined[index],
            ...income,
            amount: cleanedAmount,
            paymentDates: mergedPaymentDates,
            confidence: Math.max(
              typeof income.confidence === "number" ? income.confidence : 0,
              index >= 0 && typeof combined[index]?.confidence === "number" ? combined[index].confidence : 0
            ),
          } as ParsedIncome;

          if (index >= 0) {
            combined[index] = nextIncome;
          } else {
            combined.push({
              ...income,
              amount: cleanedAmount,
              paymentDates: mergedPaymentDates,
              confidence: typeof income.confidence === "number" ? income.confidence : 0,
            });
          }
        });
        return combined;
      });
    }
  }, [lastExtraction]);

  const aggregatedPaymentDates = useMemo(() => {
    const dates = new Set<number>();

    detectedIncomes.forEach((income) => {
      income.paymentDates?.forEach((day) => {
        if (typeof day === "number" && day > 0 && day <= 31) {
          dates.add(Math.round(day));
        }
      });
    });

    if (profile?.paymentDates?.length) {
      profile.paymentDates.forEach((day) => {
        if (typeof day === "number" && day > 0 && day <= 31) {
          dates.add(Math.round(day));
        }
      });
    }

    if (lastExtraction?.preferences?.paymentDates?.length) {
      lastExtraction.preferences.paymentDates.forEach((day) => {
        if (typeof day === "number" && day > 0 && day <= 31) {
          dates.add(Math.round(day));
        }
      });
    }

    return Array.from(dates).sort((a, b) => a - b);
  }, [detectedIncomes, lastExtraction, profile]);

  useEffect(() => {
    const hasIncomes = detectedIncomes.length > 0;
    const hasAmounts = hasIncomes && detectedIncomes.every((income) => Number.isFinite(income.amount) && income.amount > 0);
    const hasSchedule = aggregatedPaymentDates.length > 0;
    const isValidated =
      !!validation &&
      validation.errors.length === 0 &&
      validation.schemaErrors.length === 0 &&
      validation.suggestions.length === 0 &&
      hasIncomes &&
      hasAmounts;

    let nextPhase: IncomeConversationPhase = "discovery";

    if (!hasIncomes) {
      nextPhase = "discovery";
    } else if (!hasAmounts) {
      nextPhase = "amounts";
    } else if (!hasSchedule) {
      nextPhase = "schedule";
    } else if (isValidated) {
      nextPhase = "confirmation";
    } else {
      nextPhase = "schedule";
    }

    if (conversationPhase !== nextPhase) {
      setConversationPhase(nextPhase);
    }
  }, [aggregatedPaymentDates, detectedIncomes, validation]);

  const conversationSteps = useMemo<ConversationStep[]>(() => {
    const discoveryStatus: StepStatus = conversationPhase === "discovery" ? "current" : "complete";
    const amountsStatus: StepStatus =
      conversationPhase === "discovery"
        ? "upcoming"
        : conversationPhase === "amounts"
          ? "current"
          : "complete";
    const scheduleStatus: StepStatus =
      conversationPhase === "schedule"
        ? "current"
        : conversationPhase === "confirmation"
          ? "complete"
          : conversationPhase === "discovery" || conversationPhase === "amounts"
            ? "upcoming"
            : "complete";
    const confirmationStatus: StepStatus = conversationPhase === "confirmation" ? "current" : "upcoming";

    return [
      { id: "discovery", label: "Fuentes", status: discoveryStatus },
      { id: "amounts", label: "Montos", status: amountsStatus },
      { id: "schedule", label: "Fechas", status: scheduleStatus },
      { id: "confirmation", label: "Confirmación", status: confirmationStatus },
    ];
  }, [conversationPhase]);

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
              <Text className="text-blue-800 font-medium text-sm">Bussy AI - Ingresos</Text>
            </View>
          )}

          <Text className={`text-sm leading-snug ${isAssistant ? "text-blue-900" : "text-green-900"}`}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

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

    const prompt = buildIncomeSystemPrompt({
      userInput: message,
      currencySymbol,
      profile: profile || null,
      detectedIncomes,
      existingIncomes: incomes,
      conversationPhase,
      paymentDates: aggregatedPaymentDates,
    });

    await sendUserMessage(message, {
      systemPrompt: prompt,
      context: {
        existingIncomes: incomes,
        profile,
        conversationPhase,
        paymentDates: aggregatedPaymentDates,
        detectedIncomes,
      },
    });

    scrollToBottom();
  };

  const handleFinishSetup = useCallback(() => {
    let currentIncomes = incomes;

    if (currentIncomes.length === 0 && detectedIncomes.length > 0) {
      let markPrimary = true;

      detectedIncomes.forEach((income) => {
        const resolvedAmount = resolveIncomeAmount(income);
        if (!Number.isFinite(resolvedAmount) || !resolvedAmount) {
          return;
        }

        addIncome({
          name: income.name || "Ingreso",
          type: income.type,
          amount: resolvedAmount,
          frequency: (income.frequency || "monthly") as IncomeSource["frequency"],
          isActive: true,
          isPrimary: markPrimary,
          isVariable: income.isVariable ?? false,
          country: profile?.country || "GT",
          minAmount: income.minAmount,
          maxAmount: income.maxAmount,
          paymentPattern: income.paymentDates && income.paymentDates.length > 1 ? "complex" : "simple",
          paymentSchedule:
            income.paymentDates && income.paymentDates.length > 1
              ? {
                  type: "fixed-dates",
                  dates: income.paymentDates,
                  description: "Generado automáticamente por Bussy",
                }
              : undefined,
          payDate:
            income.paymentDates && income.paymentDates.length === 1 ? income.paymentDates[0] : undefined,
          stabilityPattern: income.isVariable ? "variable" : "consistent",
          baseAmount: income.isVariable
            ? income.minAmount ?? resolvedAmount
            : resolvedAmount,
        });

        markPrimary = false;
      });

      currentIncomes = useUserStore.getState().incomes;
    }

    if (currentIncomes.length > 0) {
      const primary = currentIncomes[0];
      updateProfile({
        hasSetupIncome: true,
        primaryIncome: primary.amount,
        payFrequency: primary.frequency,
      });
    } else {
      updateProfile({ hasSetupIncome: true });
    }

    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  }, [addIncome, detectedIncomes, incomes, navigation, profile?.country, setOnboardingStep, updateProfile]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const canFinish =
    detectedIncomes.length > 0 &&
    conversationPhase === "confirmation" &&
    validation &&
    validation.errors.length === 0 &&
    validation.schemaErrors.length === 0 &&
    validation.suggestions.length === 0;

  return (
    <OnboardingContainer
      title="Configuración con Bussy AI"
      subtitle="Tu asistente inteligente para configurar ingresos complejos"
      currentStep={2}
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
                  <Text className="text-blue-800 font-medium text-sm">Bussy AI - Ingresos</Text>
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

          {validation && <ValidationSummaryCard validation={validation} syncSummary={syncSummary} />}

          {(detectedIncomes.length > 0 || aggregatedPaymentDates.length > 0) && (
            <View className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <Text className="text-green-800 font-medium mb-2">📊 Datos detectados:</Text>

              {detectedIncomes.length > 0 && (
                <View className="mb-2">
                  <Text className="text-green-700 font-semibold mb-2">Ingresos:</Text>
                  {detectedIncomes.map((income, index) => (
                    <Text key={`${income.name}-${index}`} className="text-green-700 text-sm">
                      • {income.name || "Ingreso"}: {Number.isFinite(income.amount)
                        ? `${currencySymbol}${income.amount.toLocaleString()}`
                        : "Monto por confirmar"}{" "}
                      ({income.frequency})
                    </Text>
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
              placeholder="Cuéntame sobre tus ingresos..."
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
            <AnimatedPressable onPress={handleFinishSetup} className="bg-green-600 rounded-xl py-4 items-center">
              <Text className="text-white font-semibold text-lg">Finalizar configuración</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}

function itemAmountFallback(value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return Number.NaN;
}

function resolveIncomeAmount(income: ParsedIncome, previousAmount?: number) {
  if (typeof income.amount === "number" && Number.isFinite(income.amount)) {
    return income.amount;
  }
  if (typeof income.minAmount === "number" && Number.isFinite(income.minAmount)) {
    return income.minAmount;
  }
  if (typeof income.maxAmount === "number" && Number.isFinite(income.maxAmount)) {
    return income.maxAmount;
  }
  return itemAmountFallback(previousAmount);
}

function mergePaymentDates(current?: number[], incoming?: number[]) {
  const set = new Set<number>();
  (current || []).forEach((day) => {
    if (typeof day === "number" && day > 0 && day <= 31) {
      set.add(Math.round(day));
    }
  });
  (incoming || []).forEach((day) => {
    if (typeof day === "number" && day > 0 && day <= 31) {
      set.add(Math.round(day));
    }
  });
  return set.size > 0 ? Array.from(set).sort((a, b) => a - b) : undefined;
}
