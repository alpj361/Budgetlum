import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import AnimatedPressable from "../../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCurrencySymbol } from "../../types/centralAmerica";
import { DataCollectionService, CollectedUserData, BudgetSuggestion } from "../../services/dataCollectionService";
import { getOpenAITextResponse } from "../../api/chat-service";
import { AIMessage } from "../../types/ai";

type AIBudgetSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "AIBudgetSetup">;

interface ChatMessage {
  id: string;
  type: "user" | "bussy" | "system";
  content: string;
  timestamp: Date;
}

interface ExtractedBudgetData {
  category: string;
  amount?: number;
  priority: "essential" | "important" | "optional";
  reasoning?: string;
}

export default function AIBudgetSetupScreen() {
  const navigation = useNavigation<AIBudgetSetupNavigationProp>();
  const { profile, incomes, setOnboardingStep, updateProfile, createBudget } = useUserStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedBudgetData, setExtractedBudgetData] = useState<ExtractedBudgetData[]>([]);
  const [userData, setUserData] = useState<CollectedUserData | null>(null);
  const [conversationPhase, setConversationPhase] = useState<"introduction" | "categories" | "details" | "confirmation">("introduction");

  const currencySymbol = getCurrencySymbol(profile?.country || "GT");

  useEffect(() => {
    initializeBudgetConversation();
  }, []);

  const initializeBudgetConversation = async () => {
    try {
      // Compile user data from income setup
      const compiledData = DataCollectionService.compileUserData(
        incomes.map(income => ({
          name: income.name,
          type: income.type,
          amount: income.amount,
          minAmount: income.minAmount,
          maxAmount: income.maxAmount,
          frequency: income.frequency,
          isVariable: income.isVariable,
          confidence: 1.0
        })),
        [], // No previous conversation history
        profile?.country || "GT",
        "advanced"
      );

      setUserData(compiledData);

      // Generate personalized introduction using AI
      const personalizedSummary = await DataCollectionService.createPersonalizedSummary(compiledData);

      const introMessage: ChatMessage = {
        id: "intro",
        type: "bussy",
        content: `${personalizedSummary}

¡Ahora viene la parte emocionante! 🎉 Vamos a crear tu presupuesto personalizado que realmente funcione para TU vida específica.

No te preocupes si nunca has hecho un presupuesto antes - yo te voy a guiar paso a paso de manera súper natural. Solo cuéntame como si le hablaras a un amigo 😊

🤔 **Para empezar, me encantaría conocer:**

💰 **¿En qué se te va principalmente el dinero cada mes?**
(Sin juzgar para nada - solo para entender tu realidad)

🏠 **¿Tienes gastos que SIEMPRE tienes que pagar?**
Como renta, luz, agua, teléfono, préstamos...

❤️ **¿Hay algo especial en lo que te gusta invertir?**
Tal vez familia, hobbies, metas, o simplemente disfrutar la vida...

**Cuéntame lo que se te ocurra** - pueden ser números exactos, estimaciones, o solo categorías. ¡Todo me sirve para ayudarte! 🚀`,
        timestamp: new Date()
      };

      setMessages([introMessage]);
      setConversationPhase("categories");
    } catch (error) {
      console.error("Error initializing budget conversation:", error);

      // Fallback introduction
      const fallbackIntro: ChatMessage = {
        id: "intro-fallback",
        type: "bussy",
        content: `¡Excelente! 🎉 Ahora vamos a crear tu presupuesto personalizado basado en tus ingresos de ${currencySymbol}${(profile?.primaryIncome || 0).toLocaleString()}.

Me emociona muchísimo ayudarte a organizar tus finanzas de una manera que realmente funcione para ti 😊

🤗 **Háblame como si fuera tu amigo financiero**:
¿En qué se te va el dinero principalmente cada mes? Puede ser alimentación, casa, transporte, familia, diversión... ¡lo que sea!

No necesitas ser súper exacto - solo cuéntame tu realidad y yo te ayudo a organizarlo perfectamente 💪`,
        timestamp: new Date()
      };

      setMessages([fallbackIntro]);
      setConversationPhase("categories");
    }
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

    try {
      // Generate AI response and extract budget data
      const [bussyResponse, extractedData] = await Promise.all([
        generateBussyBudgetResponse(currentInput),
        extractBudgetDataFromInput(currentInput)
      ]);

      // Update extracted budget data
      if (extractedData.length > 0) {
        setExtractedBudgetData(prev => {
          const updated = [...prev];
          extractedData.forEach(newData => {
            const existingIndex = updated.findIndex(item =>
              item.category.toLowerCase() === newData.category.toLowerCase()
            );

            if (existingIndex >= 0) {
              updated[existingIndex] = { ...updated[existingIndex], ...newData };
            } else {
              updated.push(newData);
            }
          });
          return updated;
        });
      }

      // Add Bussy's response
      const bussyMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bussy",
        content: bussyResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, bussyMessage]);

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error("Error processing budget message:", error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bussy",
        content: "Perdón, tuve un problema procesando tu mensaje. ¿Puedes contarme más sobre tus gastos habituales?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateBussyBudgetResponse = async (userInput: string): Promise<string> => {
    const systemPrompt = `Eres Bussy, el asistente financiero cálido, conversacional y adaptable de Budgetlum. Estás ayudando al usuario a crear su presupuesto personalizado después de haber configurado sus ingresos exitosamente. 🎯

**Tu personalidad para presupuestos**:
- 💰 Entusiasta sobre ayudar a organizar las finanzas
- 🤗 Empático con las realidades financieras de Centroamérica
- 😊 Conversacional y alentador, celebra cada progreso
- 💡 Curioso sobre los hábitos y prioridades del usuario
- 🌟 Adaptable al estilo de comunicación (formal/casual/nervioso)

**Análisis del mensaje**: "${userInput}"

**Contexto del usuario:**
- 💵 Ingreso mensual: ${currencySymbol}${userData?.monthlyIncome?.toLocaleString() || 0}
- 🇬🇹 País: ${userData?.country || "GT"}
- 📊 Estabilidad: ${userData?.incomeStability || "desconocida"}
- 🗣️ Fase actual: ${conversationPhase}

**Presupuesto ya detectado:**
${extractedBudgetData.length > 0 ? extractedBudgetData.map(item => `- ${item.category}: ${item.amount ? currencySymbol + item.amount.toLocaleString() : "🤔 monto pendiente"} (${item.priority})`).join('\n') : "🔍 Aún explorando sus gastos..."}

**Instrucciones para esta respuesta**:

1. **ADAPTABILIDAD**:
   - Si están nerviosos/abrumados → Tranquiliza y simplifica
   - Si son detallados → Aprecia la información y profundiza
   - Si son breves → Haz preguntas específicas pero amigables
   - Si están entusiasmados → Comparte su energía

2. **RECONOCIMIENTO EMOCIONAL**:
   - Valida sus preocupaciones sobre gastos
   - Celebra cuando comparten información útil
   - Muestra comprensión de su situación específica

3. **EXTRACCIÓN INTELIGENTE**:
   - Detecta categorías: "comida", "renta", "gasolina", "familia"
   - Identifica montos: "gasto Q500", "como Q2000", "entre 800-1200"
   - Reconoce frecuencias: "mensual", "cada semana", "cuando puedo"
   - Nota patrones emocionales: "se me va mucho en...", "siempre gasto más en..."

4. **PREGUNTAS CULTURALMENTE CONSCIENTES**:
   - 🏠 "¿Cuánto destinas para vivienda (renta/hipoteca)?"
   - 🍽️ "¿Y para alimentación familiar?"
   - 👨‍👩‍👧‍👦 "¿Apoyas económicamente a familia?" (común en CA)
   - 🎉 "¿Apartas algo para celebraciones/fiestas?"
   - 🚗 "¿Tienes gastos de transporte o vehículo?"
   - 🏥 "¿Consideras gastos médicos/emergencias?"

5. **ESTILO DE RESPUESTA**:
   - Reconoce específicamente lo que compartieron
   - Haz 1-2 preguntas relevantes (no abrumes)
   - Usa emojis apropiados para el contexto
   - Incluye validación emocional cuando sea pertinente
   - Sugiere próximos pasos de manera natural

**Ejemplos de tono adaptable**:
- Usuario preocupado: "Entiendo que organizar gastos puede dar ansiedad, pero veo que ya tienes claridad sobre..."
- Usuario casual: "¡Me encanta que seas tan específico! Eso me ayuda muchísimo a..."
- Usuario detallado: "Wow, qué información tan útil. Veo que realmente conoces tus gastos..."

**Categorías culturalmente relevantes** (sugiérelas naturalmente):
Esenciales: Alimentación, Vivienda, Transporte, Servicios básicos
Familiares: Remesas, Apoyo familiar, Educación hijos
Culturales: Festividades, Celebraciones, Tradiciones
Futuro: Ahorro emergencia, Metas personales

Sé conversacional, cálido y genuinamente interesado en ayudarles a crear un presupuesto que refleje su realidad y valores. ¡Haz que se sientan acompañados en este proceso!

Responde en español de manera conversacional y útil.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    const response = await getOpenAITextResponse(messages, {
      temperature: 0.7,
      maxTokens: 1024
    });

    return response.content;
  };

  const extractBudgetDataFromInput = async (userInput: string): Promise<ExtractedBudgetData[]> => {
    const extractionPrompt = `Analiza el siguiente texto del usuario y extrae información específica sobre categorías de presupuesto y gastos mencionados.

Texto del usuario: "${userInput}"

Contexto: Usuario de ${userData?.country || "GT"} con ingresos de ${currencySymbol}${userData?.monthlyIncome?.toLocaleString() || 0}

Extrae:
1. Categorías de gastos mencionadas
2. Montos específicos (si se mencionan)
3. Frecuencia de gastos (mensual, semanal, etc.)
4. Prioridad aparente (esencial, importante, opcional)

Responde SOLO con un JSON válido en este formato:
{
  "extracted": [
    {
      "category": "Alimentación",
      "amount": 1500,
      "priority": "essential",
      "reasoning": "Usuario mencionó gastar en comida diariamente"
    }
  ]
}

Si no hay información específica sobre presupuesto, responde: {"extracted": []}`;

    try {
      const messages: AIMessage[] = [
        { role: 'user', content: extractionPrompt }
      ];

      const response = await getOpenAITextResponse(messages, {
        temperature: 0.1,
        maxTokens: 1024
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
      return parsed.extracted || [];
    } catch (error) {
      console.error("Error extracting budget data:", error);
      return [];
    }
  };

  const handleFinishBudgetSetup = async () => {
    try {
      // Generate final budget suggestions using AI
      if (userData) {
        const budgetSuggestions = await DataCollectionService.generateBudgetSuggestions(userData);

        // Merge with extracted data
        const finalBudgetSuggestions = budgetSuggestions.map(suggestion => {
          const extracted = extractedBudgetData.find(item =>
            item.category.toLowerCase() === suggestion.category.toLowerCase()
          );

          return {
            ...suggestion,
            suggestedAmount: extracted?.amount || suggestion.suggestedAmount
          };
        });

        // Create budget categories
        const budgetCategories = finalBudgetSuggestions.map(suggestion => ({
          name: suggestion.category,
          limit: suggestion.suggestedAmount,
          spent: 0,
          priority: suggestion.priority,
          reasoning: suggestion.reasoning,
          isActive: true,
          period: "monthly" as const
        }));

        // Calculate total limit
        const totalLimit = budgetCategories.reduce((sum, cat) => sum + cat.limit, 0);

        // Create the budget
        const budget = {
          name: "Mi Presupuesto con Bussy",
          categories: budgetCategories,
          totalLimit,
          totalSpent: 0,
          period: "monthly" as const,
          isActive: true
        };

        createBudget(budget);

        updateProfile({
          hasSetupBudget: true,
          budgetSetupMethod: "ai"
        });

        setOnboardingStep(5);
        navigation.navigate("Goals");
      }
    } catch (error) {
      console.error("Error finishing budget setup:", error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(5);
    navigation.navigate("Goals");
  };

  const renderMessage = (message: ChatMessage) => {
    const isBussy = message.type === "bussy";

    return (
      <View
        key={message.id}
        className={`mb-4 ${isBussy ? "items-start" : "items-end"}`}
      >
        <View
          className={`max-w-[85%] rounded-xl px-4 py-3 ${
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
              <Text className="text-blue-800 font-medium text-sm">Bussy AI - Presupuesto</Text>
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

  const canFinish = extractedBudgetData.length >= 3 && conversationPhase === "confirmation";

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
                  <Text className="text-blue-800 font-medium text-sm mr-2">Bussy está analizando</Text>
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

        {/* Extracted Budget Preview */}
        {extractedBudgetData.length > 0 && (
          <View className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <Text className="text-green-800 font-medium mb-2">
              📊 Categorías de presupuesto detectadas:
            </Text>
            {extractedBudgetData.map((item, index) => (
              <View key={index} className="flex-row items-center justify-between py-1">
                <Text className="text-green-700 text-sm flex-1">
                  • {item.category}
                </Text>
                <Text className="text-green-600 text-xs">
                  {item.amount ? `${currencySymbol}${item.amount.toLocaleString()}` : "Por definir"}
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
              placeholder="Cuéntame sobre tus gastos..."
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
              onPress={handleFinishBudgetSetup}
              className="bg-green-600 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-semibold text-lg">
                Finalizar presupuesto
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}