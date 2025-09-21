import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import AnimatedPressable from "../../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CENTRAL_AMERICA_COUNTRIES, getCurrencySymbol } from "../../types/centralAmerica";
import { BussyAIService, IntelligentIncomeData, ConversationContext } from "../../services/bussyAIService";

type AdvancedIncomeSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "AdvancedIncomeSetup">;

interface ChatMessage {
  id: string;
  type: "user" | "bussy" | "system";
  content: string;
  timestamp: Date;
}

interface ParsedIncomeSource {
  name: string;
  type: "salary" | "freelance" | "business" | "rental" | "remittance";
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  frequency: "monthly" | "bi-weekly" | "weekly" | "project" | "seasonal";
  isVariable: boolean;
  country?: string;
  confidence: number;
}

export default function AdvancedIncomeSetupScreen() {
  const navigation = useNavigation<AdvancedIncomeSetupNavigationProp>();
  const { updateProfile, addIncome, setOnboardingStep, profile } = useUserStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "bussy",
      content: "¡Hola! 👋 Soy Bussy, tu asistente financiero personal. ¡Me da mucho gusto conocerte! 🤗\n\nEstoy aquí para ayudarte a configurar tus ingresos de manera súper fácil y personalizada. No te preocupes si tienes una situación financiera compleja - ¡esa es mi especialidad! 💪\n\n💰 **Cuéntame sobre tu dinero**:\n• ¿Trabajas en alguna empresa o eres independiente?\n• ¿Recibes remesas o apoyo familiar?\n• ¿Tienes algún negocio propio o ventas?\n• ¿Rentas algo o tienes otros ingresos?\n\n**No importa si es complicado** - puedes contarme todo como te sale naturalmente. Yo voy a entender y organizar todo perfectamente 😊\n\n¿Por dónde empezamos? 🚀",
      timestamp: new Date()
    }
  ]);

  const [currentInput, setCurrentInput] = useState("");
  const [parsedSources, setParsedSources] = useState<IntelligentIncomeData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    collectedSources: [],
    missingInfo: [],
    conversationPhase: "discovery",
    userCountry: profile?.country || "GT",
    totalConfidence: 0
  });

  // Get country-specific data
  const countryConfig = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === (profile?.country || "GT"));
  const currencySymbol = getCurrencySymbol(profile?.country || "GT");

  // Only scroll when user sends a message or receives a response
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Use intelligent Bussy AI service

  const sendMessage = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentInput.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput("");
    setIsProcessing(true);

    // Scroll after user sends message
    scrollToBottom();

    // Use intelligent Bussy AI processing
    setTimeout(async () => {
      try {
        // Generate intelligent response using real GPT-4o AI
        const bussyResponse = await BussyAIService.generateBussyResponse(currentInput, conversationContext);

        // Parse income data using AI
        const extractedSources = await BussyAIService.parseIncomeDataWithAI(currentInput, conversationContext);

        // Update state with AI-extracted data
        if (extractedSources.length > 0) {
          setParsedSources(prev => {
            const newSources = [...prev];
            extractedSources.forEach(newData => {
              const existingIndex = newSources.findIndex(s =>
                s.type === newData.type && Math.abs((s.amount || 0) - (newData.amount || 0)) < 100
              );

              if (existingIndex >= 0) {
                // Update existing source
                newSources[existingIndex] = { ...newSources[existingIndex], ...newData };
              } else {
                // Add new source
                newSources.push(newData);
              }
            });
            return newSources;
          });

          // Update conversation context based on new data
          setConversationContext(prev => ({
            ...prev,
            collectedSources: [...prev.collectedSources, ...extractedSources],
            conversationPhase: extractedSources.length > 0 ? "details" : prev.conversationPhase,
            totalConfidence: prev.totalConfidence + extractedSources.reduce((sum, s) => sum + (s.confidence || 0), 0)
          }));
        }

        // Send Bussy's response
        const bussyMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "bussy",
          content: bussyResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, bussyMessage]);
        setIsProcessing(false);

        // Scroll after AI responds
        scrollToBottom();

      } catch (error) {
        console.error("Bussy AI processing error:", error);

        // Fallback response
        const fallbackMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "bussy",
          content: "Perdón, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo con más detalles sobre tus ingresos?",
          timestamp: new Date()
        };

        setMessages(prev => [...prev, fallbackMessage]);
        setIsProcessing(false);
      }
    }, 1500);
  };

  const handleFinishSetup = () => {
    // Convert parsed sources to income objects
    parsedSources.forEach((source, index) => {
      const incomeSource = {
        id: `income-${index}`,
        name: source.name,
        type: source.type,
        amount: source.amount || source.minAmount || 0,
        minAmount: source.minAmount,
        maxAmount: source.maxAmount,
        frequency: source.frequency as any,
        isActive: true,
        isPrimary: index === 0,
        isVariable: source.isVariable,
        country: profile?.country || "GT"
      };

      addIncome(incomeSource);
    });

    // Update profile
    const primaryIncome = parsedSources[0];
    if (primaryIncome) {
      updateProfile({
        primaryIncome: primaryIncome.amount || primaryIncome.minAmount || 0,
        payFrequency: primaryIncome.frequency as any,
        hasSetupIncome: true
      });
    }

    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const renderMessage = (message: ChatMessage) => {
    const isBussy = message.type === "bussy";

    return (
      <View
        key={message.id}
        className={`mb-4 ${isBussy ? "items-start" : "items-end"}`}
      >
        <View
          className={`max-w-[80%] rounded-xl px-4 py-3 ${
            isBussy
              ? "bg-blue-100 border border-blue-200"
              : "bg-green-100 border border-green-200"
          }`}
        >
          {isBussy && (
            <View className="flex-row items-center mb-2">
              <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">B</Text>
              </View>
              <Text className="text-blue-800 font-medium text-sm">Bussy AI</Text>
            </View>
          )}

          <Text
            className={`text-sm leading-5 ${
              isBussy ? "text-blue-900" : "text-green-900"
            }`}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const canFinish = parsedSources.length > 0 && (
    conversationContext.conversationPhase === "confirmation" ||
    conversationContext.totalConfidence > 1.5 ||
    parsedSources.some(s => (s.confidence || 0) > 0.6)
  );

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
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 mb-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map(renderMessage)}

          {isProcessing && (
            <View className="items-start mb-4">
              <View className="bg-blue-100 border border-blue-200 rounded-xl px-4 py-3">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                    <Text className="text-white text-xs font-bold">B</Text>
                  </View>
                  <Text className="text-blue-800 font-medium text-sm mr-2">Bussy está escribiendo</Text>
                  <View className="flex-row space-x-1">
                    <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <View className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Parsed Income Sources Preview */}
        {parsedSources.length > 0 && (
          <View className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <Text className="text-green-800 font-medium mb-2">
              📊 Fuentes de ingreso detectadas:
            </Text>
            {parsedSources.map((source, index) => (
              <View key={index} className="flex-row items-center justify-between py-1">
                <Text className="text-green-700 text-sm flex-1">
                  • {source.name}
                </Text>
                <Text className="text-green-600 text-xs">
                  {source.amount ? `${currencySymbol}${source.amount.toLocaleString()}` : "Variable"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View className="flex-row items-end space-x-3 p-4 bg-gray-50 rounded-xl">
            <TextInput
              ref={inputRef}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 max-h-24"
              placeholder="Escribe aquí tu respuesta..."
              placeholderTextColor="#9CA3AF"
              value={currentInput}
              onChangeText={setCurrentInput}
              multiline
              textAlignVertical="top"
              onSubmitEditing={sendMessage}
              editable={!isProcessing}
              onFocus={scrollToBottom}
            />

            <AnimatedPressable
              onPress={sendMessage}
              disabled={!currentInput.trim() || isProcessing}
              className={`p-3 rounded-xl ${
                currentInput.trim() && !isProcessing
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={currentInput.trim() && !isProcessing ? "white" : "#9CA3AF"}
              />
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>

        {/* Finish Button */}
        {canFinish && (
          <View className="mt-4">
            <AnimatedPressable
              onPress={handleFinishSetup}
              className="bg-green-600 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-semibold text-lg">
                Finalizar configuración
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}