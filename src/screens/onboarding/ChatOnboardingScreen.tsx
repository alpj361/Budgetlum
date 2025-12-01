import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Platform,
  Keyboard,
  Animated,
  Easing,
} from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCurrencySymbol } from "../../types/centralAmerica";
import { useUnifiedChat } from "../../contexts/UnifiedChatContext";
import AnimatedPressable from "../../components/AnimatedPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DataCollectionService } from "../../services/dataCollectionService";

type ChatOnboardingNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  "ChatOnboarding"
>;

interface QuickAction {
  id: string;
  label: string;
  payload: string;
}

export default function ChatOnboardingScreen() {
  const navigation = useNavigation<ChatOnboardingNavigationProp>();
  const {
    messages,
    isTyping,
    lastExtraction,
    validation,
    syncSummary,
    onboardingPhase,
    sendUserMessage,
    resetConversation,
    canFinishOnboarding,
  } = useUnifiedChat();

  const { incomes, profile, budgets, completeOnboarding, createBudget, updateProfile } = useUserStore((state) => ({
    incomes: state.incomes,
    profile: state.userProfile,
    budgets: state.budgets,
    completeOnboarding: state.completeOnboarding,
    createBudget: state.createBudget,
    updateProfile: state.updateProfile,
  }));

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [currentInput, setCurrentInput] = useState("");
  const [introMessage, setIntroMessage] = useState<string | null>(null);
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const composerTranslate = useRef(new Animated.Value(0)).current;
  const [composerHeight, setComposerHeight] = useState(0);
  const keyboardOffset = Math.max(0, keyboardHeight - safeAreaBottom);

  const currencySymbol = getCurrencySymbol(profile?.country || "GT");

  // Quick action suggestions based on phase
  const quickActions: QuickAction[] = React.useMemo(() => {
    switch (onboardingPhase) {
      case "introduction":
      case "income":
        return [
          { id: "salary", label: "Salario mensual", payload: `Tengo un salario mensual de ${currencySymbol}5000` },
          { id: "freelance", label: "Freelance", payload: "Soy freelancer y mis ingresos varían" },
          { id: "biweekly", label: "Pago quincenal", payload: `Me pagan ${currencySymbol}3000 quincenal` },
        ];
      case "expenses":
        return [
          { id: "rent", label: "Renta", payload: `Pago ${currencySymbol}2500 de renta cada mes` },
          { id: "food", label: "Alimentación", payload: `Gasto como ${currencySymbol}1500 en comida` },
          { id: "transport", label: "Transporte", payload: `${currencySymbol}500 en transporte mensual` },
        ];
      case "goals":
        return [
          { id: "emergency", label: "Fondo de emergencia", payload: "Quiero ahorrar para un fondo de emergencia" },
          { id: "vacation", label: "Vacaciones", payload: `Ahorrar ${currencySymbol}10000 para vacaciones` },
          { id: "debt", label: "Pagar deudas", payload: "Necesito pagar una deuda" },
        ];
      default:
        return [];
    }
  }, [onboardingPhase, currencySymbol]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (!introMessage) {
      const welcomeMessage = `¡Hola! 👋 Soy Bussy, tu asistente financiero personal.\n\nVoy a ayudarte a crear tu presupuesto personalizado de forma súper sencilla. Solo necesito que me cuentes sobre tu situación financiera de manera natural, como si hablaras con un amigo 😊\n\n**Para empezar, cuéntame:**\n💰 ¿Cuáles son tus ingresos? (trabajo, freelance, negocio, etc.)\n📅 ¿Cada cuánto te pagan?\n💵 ¿Cuánto recibes aproximadamente?\n\n¡No te preocupes si no tienes números exactos! Aproximaciones también funcionan perfecto 🎯`;
      setIntroMessage(welcomeMessage);
    }
  }, [introMessage]);

  // Keyboard handling
  const animateComposer = useCallback(
    (offset: number, duration = 220) => {
      Animated.timing(composerTranslate, {
        toValue: -offset,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    },
    [composerTranslate]
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);
      const offset = Math.max(0, height - safeAreaBottom);
      animateComposer(offset, event.duration ?? 240);
      setTimeout(() => scrollToBottom(), 60);
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardHeight(0);
      animateComposer(0, event?.duration ?? 200);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [animateComposer, safeAreaBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, introMessage, scrollToBottom]);

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
    await sendUserMessage(message);
    scrollToBottom();
  };

  const handleFinishOnboarding = async () => {
    try {
      // Create budget if not already created
      if (budgets.length === 0 && lastExtraction?.expenses && lastExtraction.expenses.length > 0) {
        const userData = DataCollectionService.compileUserData(
          incomes.map((inc) => ({
            name: inc.name,
            type: inc.type,
            amount: inc.amount,
            minAmount: inc.minAmount,
            maxAmount: inc.maxAmount,
            frequency: inc.frequency,
            isVariable: inc.isVariable,
            confidence: 1.0,
          })),
          [],
          profile?.country || "GT",
          "advanced"
        );

        const budgetSuggestions = await DataCollectionService.generateBudgetSuggestions(userData);

        // Merge with detected expenses
        const budgetCategories = budgetSuggestions.map((suggestion) => {
          const detected = lastExtraction.expenses.find(
            (exp) => exp.category.toLowerCase() === suggestion.category.toLowerCase()
          );

          return {
            name: suggestion.category,
            limit: detected?.amount || suggestion.suggestedAmount,
            spent: 0,
            priority: suggestion.priority,
            reasoning: suggestion.reasoning,
            isActive: true,
            period: "monthly" as const,
          };
        });

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
      }

      // Mark profile as setup complete
      updateProfile({
        hasSetupBudget: true,
        hasSetupIncome: true,
        budgetSetupMethod: "ai",
      });

      // Complete onboarding
      completeOnboarding();

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" as any }],
      });
    } catch (error) {
      console.error("Error finishing onboarding:", error);
    }
  };

  const renderMessage = (message: typeof messages[0]) => {
    const isAssistant = message.role === "assistant";

    return (
      <View key={message.id} className={`mb-2 ${isAssistant ? "items-start" : "items-end"}`}>
        <View
          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
            isAssistant
              ? "bg-blue-50 border border-blue-100 rounded-bl-md"
              : "bg-green-500 rounded-br-md"
          }`}
        >
          {isAssistant && (
            <View className="flex-row items-center mb-2">
              <View className="w-7 h-7 bg-blue-600 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">B</Text>
              </View>
              <Text className="text-blue-900 font-semibold text-sm">Bussy</Text>
            </View>
          )}

          <Text
            className={`text-[15px] leading-relaxed ${
              isAssistant ? "text-blue-900" : "text-white"
            }`}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  // Progress indicator
  const progressSteps = [
    { id: "income", label: "Ingresos", completed: incomes.length > 0 },
    { id: "expenses", label: "Gastos", completed: (lastExtraction?.expenses.length ?? 0) >= 3 },
    { id: "goals", label: "Metas", completed: profile.financialGoals.length > 0 },
    { id: "budget", label: "Presupuesto", completed: canFinishOnboarding() },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Configuración con Bussy</Text>
            <Text className="text-gray-600 text-sm mt-1">
              Fase: {onboardingPhase === "income" ? "Ingresos" : onboardingPhase === "expenses" ? "Gastos" : onboardingPhase === "goals" ? "Metas" : "Confirmación"}
            </Text>
          </View>
          <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center">
            <Ionicons name="chatbubbles" size={24} color="white" />
          </View>
        </View>

        {/* Progress Steps */}
        <View className="flex-row justify-between mt-2">
          {progressSteps.map((step, index) => (
            <View key={step.id} className="items-center flex-1">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  step.completed ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                {step.completed ? (
                  <Ionicons name="checkmark" size={18} color="white" />
                ) : (
                  <Text className="text-white text-xs font-bold">{index + 1}</Text>
                )}
              </View>
              <Text className="text-xs text-gray-600 mt-1">{step.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: composerHeight + keyboardOffset + 16,
        }}
      >
        {/* Intro message */}
        {introMessage && (
          <View className="mb-2 items-start">
            <View className="bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-w-[90%]">
              <View className="flex-row items-center mb-2">
                <View className="w-7 h-7 bg-blue-600 rounded-full items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">B</Text>
                </View>
                <Text className="text-blue-900 font-semibold text-sm">Bussy</Text>
              </View>
              <Text className="text-[15px] text-blue-900 leading-relaxed">{introMessage}</Text>
            </View>
          </View>
        )}

        {/* Chat messages */}
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {isTyping && (
          <View className="items-start mb-2">
            <View className="bg-blue-50 border border-blue-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-7 h-7 bg-blue-600 rounded-full items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">B</Text>
                </View>
                <Text className="text-blue-800 text-sm mr-2">Analizando...</Text>
                <View className="flex-row space-x-1">
                  <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Data summary card */}
        {(incomes.length > 0 || (lastExtraction?.expenses.length ?? 0) > 0) && (
          <View className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <Text className="text-green-800 font-semibold mb-2">📊 Datos recopilados:</Text>

            {incomes.length > 0 && (
              <View className="mb-2">
                <Text className="text-green-700 font-medium text-sm mb-1">Ingresos:</Text>
                {incomes.map((income, idx) => (
                  <Text key={income.id} className="text-green-700 text-sm">
                    • {income.name}: {currencySymbol}
                    {income.amount.toLocaleString()} ({income.frequency})
                  </Text>
                ))}
              </View>
            )}

            {lastExtraction && lastExtraction.expenses.length > 0 && (
              <View>
                <Text className="text-green-700 font-medium text-sm mb-1">Gastos:</Text>
                {lastExtraction.expenses.map((expense, idx) => (
                  <Text key={idx} className="text-green-700 text-sm">
                    • {expense.category}: {currencySymbol}
                    {expense.amount.toLocaleString()}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input composer */}
      <Animated.View
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          setComposerHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY: composerTranslate }],
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: safeAreaBottom || 12,
          backgroundColor: "white",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderColor: "#e5e7eb",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        }}
      >
        {/* Quick actions */}
        {quickActions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {quickActions.map((action) => (
              <AnimatedPressable
                key={action.id}
                onPress={() => handleQuickAction(action.payload)}
                disabled={isTyping}
                className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mr-2"
              >
                <Text className="text-blue-700 text-sm font-medium">{action.label}</Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        )}

        {/* Input row */}
        <View className="flex-row items-end mb-2">
          <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 mr-2">
            <TextInput
              ref={inputRef}
              value={currentInput}
              onChangeText={setCurrentInput}
              placeholder="Cuéntame sobre tus ingresos o gastos..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              className="text-gray-900 text-base"
              style={{ maxHeight: 100 }}
              editable={!isTyping}
              onFocus={scrollToBottom}
            />
          </View>

          <AnimatedPressable
            onPress={handleSendMessage}
            disabled={!currentInput.trim() || isTyping}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              currentInput.trim() && !isTyping ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <Ionicons
              name="send"
              size={20}
              color={currentInput.trim() && !isTyping ? "white" : "#9ca3af"}
            />
          </AnimatedPressable>
        </View>

        {/* Finish button */}
        {canFinishOnboarding() && (
          <AnimatedPressable
            onPress={handleFinishOnboarding}
            className="bg-green-600 rounded-xl py-4 items-center mt-2"
          >
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">
                Finalizar y ver mi presupuesto
              </Text>
            </View>
          </AnimatedPressable>
        )}
      </Animated.View>
    </View>
  );
}
