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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AIMessage } from "../types/ai";
import { getBussyResponse, getBussyWelcomeMessage } from "../api/chat-service";
import { useExpenseStore } from "../state/expenseStore";
import { useUserStore } from "../state/userStore";

interface ChatMessage extends AIMessage {
  id: string;
  timestamp: Date;
}

export default function AIChatScreen() {
  const { expenses, budgets, getTotalSpent } = useExpenseStore();
  const { userProfile, getTotalIncome } = useUserStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize chat with Bussy's welcome message
  useEffect(() => {
    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const initializeChat = async () => {
    try {
      const welcomeContent = await getBussyWelcomeMessage(userProfile);

      const welcomeMessage: ChatMessage = {
        id: "welcome-1",
        role: "assistant",
        content: welcomeContent,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error("Error initializing Bussy chat:", error);
      // Fallback welcome message
      const fallbackMessage: ChatMessage = {
        id: "welcome-fallback",
        role: "assistant",
        content: userProfile?.name
          ? `¡Hola ${userProfile.name}! 👋 Soy Bussy, tu asistente financiero personal. ¿En qué puedo ayudarte hoy?`
          : "¡Hola! 👋 Soy Bussy, tu asistente financiero personal. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build context for Bussy
      const context = {
        userProfile,
        recentExpenses: expenses.slice(0, 10),
        budgets,
        totalSpent: getTotalSpent(),
        monthlyIncome: getTotalIncome("monthly"),
      };

      const response = await getBussyResponse(userMessage.content, context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 bg-gray-50">
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="py-4 space-y-4">
            {messages.map((message) => (
              <View
                key={message.id}
                className={`flex-row ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <View
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-500 rounded-br-md"
                      : "bg-white border border-gray-200 rounded-bl-md"
                  }`}
                >
                  <Text
                    className={`text-sm leading-5 ${
                      message.role === "user" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {message.content}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      message.role === "user" ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
            {isLoading && (
              <View className="flex-row justify-start">
                <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text className="ml-2 text-gray-500 text-sm">Escribiendo...</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input Area */}
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
                placeholder="Escribe tu mensaje..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                className="text-gray-800 text-sm"
                style={{ maxHeight: 100 }}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                blurOnSubmit={false}
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
      </View>
    </KeyboardAvoidingView>
  );
}
