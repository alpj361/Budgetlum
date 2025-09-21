import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AIMessage } from "../types/ai";
import {
  getBussyResponse,
  getBussyWelcomeMessage,
  getBussyAdvancedResponse,
  getBussyAdvancedWelcome
} from "../api/chat-service";
import { useExpenseStore } from "../state/expenseStore";
import { useUserStore } from "../state/userStore";
import { useConversationStore } from "../state/conversationStore";
import { aiActionService, AIAction } from "../services/aiActionService";
import { parseIncomeFromText } from "../utils/incomeParser";

interface ChatMessage extends AIMessage {
  id: string;
  timestamp: Date;
  actions?: AIAction[];
}

interface ActionConfirmationProps {
  action: AIAction;
  onConfirm: () => void;
  onCancel: () => void;
}

function ActionConfirmation({ action, onConfirm, onCancel }: ActionConfirmationProps) {
  const { title, details } = aiActionService.getActionPreview(action);

  return (
    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text className="text-blue-800 font-semibold ml-2">{title}</Text>
      </View>

      {details.map((detail, index) => (
        <Text key={index} className="text-blue-700 text-sm mb-1">• {detail}</Text>
      ))}

      <View className="flex-row justify-end mt-3 space-x-3">
        <TouchableOpacity
          onPress={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300"
        >
          <Text className="text-gray-700 font-medium">Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          className="px-4 py-2 rounded-lg bg-blue-600"
        >
          <Text className="text-white font-medium">Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AIChatScreen() {
  const { expenses, budgets, getTotalSpent } = useExpenseStore();
  const { userProfile, getTotalIncome } = useUserStore();
  const {
    currentMode,
    advancedModeState,
    setMode,
    updateConversationStep,
    addMessage,
    addPendingAction,
    removePendingAction,
    updateCollectedIncomes,
    getCurrentStepProgress,
    isAdvancedModeActive
  } = useConversationStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize chat based on current mode
  useEffect(() => {
    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    }
  }, [isInitialized, currentMode]);

  const initializeChat = async () => {
    try {
      let welcomeContent: string;

      if (currentMode === 'advanced') {
        welcomeContent = await getBussyAdvancedWelcome(userProfile);
        updateConversationStep('WELCOME');
      } else {
        welcomeContent = await getBussyWelcomeMessage(userProfile);
      }

      const welcomeMessage: ChatMessage = {
        id: "welcome-1",
        role: "assistant",
        content: welcomeContent,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error("Error initializing chat:", error);
      // Fallback welcome message
      const fallbackMessage: ChatMessage = {
        id: "welcome-fallback",
        role: "assistant",
        content: currentMode === 'advanced'
          ? "Hola. Soy tu asistente financiero y voy a ayudarte a configurar tu presupuesto. Para empezar, cuéntame sobre tus ingresos."
          : userProfile?.name
          ? `Hola ${userProfile.name}. Soy Bussy, tu asistente financiero personal. ¿En qué puedo ayudarte hoy?`
          : "Hola. Soy Bussy, tu asistente financiero personal. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    }
  };

  // Only auto-scroll when user sends a message or receives a response
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    addMessage({ ...userMessage, role: userMessage.role as 'user' | 'assistant' });
    setInputText("");
    setIsLoading(true);

    // Only scroll after user sends message
    scrollToBottom();

    try {
      // Build context
      const context = {
        userProfile,
        recentExpenses: expenses.slice(0, 10),
        budgets,
        totalSpent: getTotalSpent(),
        monthlyIncome: getTotalIncome("monthly"),
        conversationStep: advancedModeState.currentStep,
        mode: currentMode
      };

      let response;
      if (currentMode === 'advanced') {
        response = await getBussyAdvancedResponse(userMessage.content, context);

        // Handle income parsing in Advanced Mode during income setup
        if (advancedModeState.currentStep === 'INCOME_SETUP') {
          const parsedIncomes = parseIncomeFromText(userMessage.content);
          if (parsedIncomes.length > 0) {
            updateCollectedIncomes(parsedIncomes);
          }
        }
      } else {
        response = await getBussyResponse(userMessage.content, context);
      }

      // Extract actions from AI response
      const extractedActions = aiActionService.extractActions(response.content);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        actions: extractedActions
      };

      setMessages(prev => [...prev, assistantMessage]);
      addMessage({ ...assistantMessage, role: assistantMessage.role as 'user' | 'assistant' });

      // Only scroll after AI responds
      scrollToBottom();

      // Handle pending actions
      if (extractedActions.length > 0) {
        setPendingActions(extractedActions);
        extractedActions.forEach(action => addPendingAction(action));
      }

    } catch (error) {
      console.error("Chat error:", error);
      Alert.alert(
        "Error",
        "No se pudo enviar el mensaje. Verifica tu conexión a internet y las claves de API.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionConfirm = async (action: AIAction) => {
    try {
      const result = await aiActionService.executeAction(action);

      if (result.success) {
        // Remove from pending actions
        setPendingActions(prev => prev.filter(a => a.conversationId !== action.conversationId));
        removePendingAction(action.conversationId);

        // Add success message
        const successMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `✅ ${result.message}`,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, successMessage]);
        addMessage({ ...successMessage, role: successMessage.role as 'user' | 'assistant' });
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("Error executing action:", error);
      Alert.alert("Error", "No se pudo ejecutar la acción");
    }
  };

  const handleActionCancel = (action: AIAction) => {
    setPendingActions(prev => prev.filter(a => a.conversationId !== action.conversationId));
    removePendingAction(action.conversationId);
  };

  const toggleAdvancedMode = () => {
    setShowModeSelector(!showModeSelector);
  };

  const selectMode = (mode: 'standard' | 'advanced') => {
    setMode(mode);
    setShowModeSelector(false);
    setIsInitialized(false);
    setMessages([]);
  };

  const clearChat = () => {
    Alert.alert(
      "Limpiar chat",
      "¿Estás seguro de que quieres eliminar todo el historial de conversación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: () => {
            setIsInitialized(false);
            setMessages([]);
            setPendingActions([]);
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={{ flex: 1 }} className="bg-gray-50">
      {/* Header with mode toggle and progress */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={toggleAdvancedMode}
            className="flex-row items-center"
          >
            <Ionicons
              name={currentMode === 'advanced' ? "construct" : "chatbubble-ellipses"}
              size={20}
              color={currentMode === 'advanced' ? "#10b981" : "#6b7280"}
            />
            <Text className={`ml-2 font-medium ${
              currentMode === 'advanced' ? "text-green-600" : "text-gray-700"
            }`}>
              {currentMode === 'advanced' ? 'Modo Avanzado' : 'Chat Estándar'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" className="ml-1" />
          </TouchableOpacity>

          {currentMode === 'advanced' && (
            <View className="flex-row items-center">
              <View className="bg-green-100 rounded-full px-3 py-1">
                <Text className="text-green-800 text-xs font-medium">
                  {Math.round(getCurrentStepProgress() * 100)}% completo
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Messages Container */}
      <View className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-3"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        >
          <View className="space-y-2">
            {messages.map((message) => (
              <View key={message.id} className="mb-1">
                <View
                  className={`flex-row ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <View
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      message.role === "user"
                        ? "bg-blue-500 rounded-br-md"
                        : "bg-white border border-gray-200 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <Text
                      className={`text-sm leading-snug ${
                        message.role === "user" ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {message.content}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        message.role === "user" ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {isLoading && (
              <View className="flex-row justify-start mb-1">
                <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text className="ml-2 text-gray-500 text-sm">Escribiendo...</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Fixed Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-end space-x-3">
            <TouchableOpacity
              onPress={clearChat}
              className="p-2 rounded-full bg-gray-100"
            >
              <Ionicons name="trash-outline" size={20} color="#6b7280" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-3">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={currentMode === 'advanced'
                  ? "Describe tus ingresos o gastos..."
                  : "Escribe tu mensaje..."
                }
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                className="text-gray-800 text-sm"
                style={{ maxHeight: 100 }}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                blurOnSubmit={false}
                onFocus={scrollToBottom}
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`p-3 rounded-full ${
                inputText.trim() && !isLoading
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isLoading ? "white" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Mode Selection Modal */}
      <Modal
        visible={showModeSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeSelector(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowModeSelector(false)}
        >
          <View className="bg-white rounded-xl mx-6 p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Seleccionar Modo
            </Text>

            <TouchableOpacity
              onPress={() => selectMode('standard')}
              className={`p-4 rounded-lg border mb-3 ${
                currentMode === 'standard'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-ellipses" size={24} color="#6b7280" />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-gray-900">Chat Estándar</Text>
                  <Text className="text-gray-600 text-sm">Consejos y consultas generales</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => selectMode('advanced')}
              className={`p-4 rounded-lg border ${
                currentMode === 'advanced'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons name="construct" size={24} color="#10b981" />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-gray-900">Modo Avanzado</Text>
                  <Text className="text-gray-600 text-sm">Configuración de presupuesto guiada</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
