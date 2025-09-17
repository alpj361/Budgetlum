import React, { useState, useRef } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import AnimatedPressable from "../../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CENTRAL_AMERICA_COUNTRIES, getCurrencySymbol } from "../../types/centralAmerica";

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
      content: "¡Hola! Soy Bussy, tu asistente financiero 🤖\n\nVamos a configurar tus ingresos de manera inteligente. Háblame sobre todas las fuentes de dinero que tienes:\n\n• ¿Tienes trabajo fijo o freelance?\n• ¿Recibes dinero de familiares?\n• ¿Tienes algún negocio?\n• ¿Rentas algo?\n\nCuéntame todo, yo me encargo de organizarlo 😊",
      timestamp: new Date()
    }
  ]);

  const [currentInput, setCurrentInput] = useState("");
  const [parsedSources, setParsedSources] = useState<ParsedIncomeSource[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationPhase, setConversationPhase] = useState<"initial" | "details" | "confirmation">("initial");

  // Get country-specific data
  const countryConfig = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === (profile?.country || "GT"));
  const currencySymbol = getCurrencySymbol(profile?.country || "GT");

  // Simulate AI processing for income parsing
  const parseIncomeFromText = (text: string): ParsedIncomeSource[] => {
    const sources: ParsedIncomeSource[] = [];
    const lowerText = text.toLowerCase();

    // Salary detection
    if (lowerText.includes("trabajo") || lowerText.includes("salario") || lowerText.includes("empleo")) {
      const amountMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      sources.push({
        name: "Trabajo principal",
        type: "salary",
        amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined,
        frequency: "monthly",
        isVariable: false,
        confidence: 0.9
      });
    }

    // Freelance detection
    if (lowerText.includes("freelance") || lowerText.includes("proyecto") || lowerText.includes("consulta")) {
      sources.push({
        name: "Trabajo freelance",
        type: "freelance",
        frequency: "project",
        isVariable: true,
        confidence: 0.85
      });
    }

    // Remittance detection
    if (lowerText.includes("familia") || lowerText.includes("remesa") || lowerText.includes("envío")) {
      sources.push({
        name: "Remesas familiares",
        type: "remittance",
        frequency: "monthly",
        isVariable: true,
        confidence: 0.8
      });
    }

    // Business detection
    if (lowerText.includes("negocio") || lowerText.includes("empresa") || lowerText.includes("venta")) {
      sources.push({
        name: "Negocio propio",
        type: "business",
        frequency: "monthly",
        isVariable: true,
        confidence: 0.75
      });
    }

    return sources;
  };

  const generateBussyResponse = (userMessage: string, phase: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (phase === "initial") {
      if (lowerMessage.includes("trabajo") || lowerMessage.includes("salario")) {
        return `Perfecto! Veo que tienes trabajo. Ahora cuéntame:\n\n• ¿Cuánto recibes aproximadamente al mes? (en ${currencySymbol})\n• ¿Te pagan mensual, quincenal o semanal?\n• ¿Es un monto fijo o varía?\n\n¿Tienes alguna otra fuente de ingresos además del trabajo?`;
      }

      if (lowerMessage.includes("freelance") || lowerMessage.includes("proyecto")) {
        return `¡Excelente! Trabajo freelance. Dime:\n\n• ¿Qué tipo de proyectos haces?\n• ¿Cuánto sueles ganar por mes? (rango aproximado en ${currencySymbol})\n• ¿En qué épocas del año tienes más trabajo?\n\n¿Solo freelance o tienes otras fuentes de ingreso?`;
      }

      return `Interesante! Cuéntame más detalles:\n\n• ¿Cuánto dinero recibes aproximadamente?\n• ¿Con qué frecuencia?\n• ¿Es constante o varía según la época?\n\n¿Hay alguna otra fuente de ingresos que deba saber?`;
    }

    if (phase === "details") {
      return `Perfecto, voy entendiendo tu situación. \n\nPara completar la configuración, necesito confirmar algunos detalles:\n\n• ¿Los montos que mencionaste son después de impuestos?\n• ¿Hay algún bono especial que recibas? (aguinaldo, bono 14, etc.)\n• ¿Tienes gastos relacionados con este ingreso?\n\n¿Algo más que deba considerar?`;
    }

    return `¡Listo! He procesado toda tu información. Déjame organizar tus fuentes de ingreso y luego las revisamos juntos. 📊`;
  };

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

    // Parse income sources from user input
    const newSources = parseIncomeFromText(currentInput);
    if (newSources.length > 0) {
      setParsedSources(prev => [...prev, ...newSources]);
    }

    // Simulate AI processing delay
    setTimeout(() => {
      const bussyResponse = generateBussyResponse(currentInput, conversationPhase);

      const bussyMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bussy",
        content: bussyResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, bussyMessage]);
      setIsProcessing(false);

      // Update conversation phase
      if (conversationPhase === "initial" && newSources.length > 0) {
        setConversationPhase("details");
      } else if (conversationPhase === "details") {
        setConversationPhase("confirmation");
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  const canFinish = parsedSources.length > 0 && conversationPhase === "confirmation";

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
          keyboardVerticalOffset={0}
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