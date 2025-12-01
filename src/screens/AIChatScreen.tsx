import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUnifiedChat } from "../contexts/UnifiedChatContext";
import { useUserStore } from "../state/userStore";
import { getCurrencySymbol } from "../types/centralAmerica";

export default function AIChatScreen() {
  const {
    messages,
    isTyping,
    sessionConfig,
    setMode,
    sendUserMessage,
    resetConversation,
  } = useUnifiedChat();

  const { userProfile, incomes, budgets } = useUserStore((state) => ({
    userProfile: state.userProfile,
    incomes: state.incomes,
    budgets: state.budgets,
  }));

  const [inputText, setInputText] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const currencySymbol = getCurrencySymbol(userProfile?.country || "GT");

  // Initialize chat
  useEffect(() => {
    if (!isInitialized) {
      setMode("standard");
      
      // Send welcome message
      const welcomeMessage = userProfile?.name
        ? `¡Hola ${userProfile.name}! 👋 Soy Bussy, tu asistente financiero personal.\n\n¿En qué puedo ayudarte hoy? Puedo:\n\n💰 Analizar tu situación financiera\n📊 Ayudarte a ajustar tu presupuesto\n🎯 Darte consejos para alcanzar tus metas\n💡 Responder preguntas sobre finanzas personales\n\n¡Solo pregúntame lo que necesites! 😊`
        : "¡Hola! Soy Bussy, tu asistente financiero personal. ¿En qué puedo ayudarte hoy?";
      
      // The welcome message will be shown in the initial state
      setIsInitialized(true);
    }
  }, [isInitialized, setMode, userProfile]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const message = inputText.trim();
    setInputText("");
    
    await sendUserMessage(message);
    scrollToBottom();
  };

  const clearChat = () => {
    resetConversation();
    setIsInitialized(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show welcome state
  const showWelcome = messages.length === 0;

  return (
    <View style={{ flex: 1 }} className="bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="chatbubbles" size={22} color="white" />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">Chat con Bussy</Text>
              <Text className="text-xs text-gray-600">Asistente financiero inteligente</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={clearChat}
            className="p-2 rounded-full bg-gray-100"
          >
            <Ionicons name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* User stats */}
        <View className="flex-row mt-3 space-x-2">
          <View className="flex-1 bg-blue-50 rounded-lg p-2">
            <Text className="text-blue-600 text-xs font-medium">Ingresos</Text>
            <Text className="text-blue-900 font-bold">{incomes.length}</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-lg p-2">
            <Text className="text-green-600 text-xs font-medium">Presupuestos</Text>
            <Text className="text-green-900 font-bold">{budgets.length}</Text>
          </View>
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
          {/* Welcome state */}
          {showWelcome && (
            <View className="items-center py-12">
              <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubbles" size={40} color="white" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                {userProfile?.name ? `¡Hola ${userProfile.name}!` : "¡Hola!"}
              </Text>
              <Text className="text-gray-600 text-center px-6 mb-6">
                Soy Bussy, tu asistente financiero. Estoy aquí para ayudarte con cualquier pregunta sobre tus finanzas.
              </Text>

              {/* Quick suggestions */}
              <View className="w-full px-4">
                <Text className="text-gray-700 font-medium mb-3">Puedo ayudarte con:</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center bg-white rounded-lg p-3 border border-gray-200">
                    <Ionicons name="analytics" size={20} color="#3b82f6" />
                    <Text className="ml-3 text-gray-700">Analizar tu situación financiera</Text>
                  </View>
                  <View className="flex-row items-center bg-white rounded-lg p-3 border border-gray-200">
                    <Ionicons name="wallet" size={20} color="#10b981" />
                    <Text className="ml-3 text-gray-700">Ajustar tu presupuesto</Text>
                  </View>
                  <View className="flex-row items-center bg-white rounded-lg p-3 border border-gray-200">
                    <Ionicons name="trending-up" size={20} color="#f59e0b" />
                    <Text className="ml-3 text-gray-700">Consejos para ahorrar</Text>
                  </View>
                  <View className="flex-row items-center bg-white rounded-lg p-3 border border-gray-200">
                    <Ionicons name="help-circle" size={20} color="#8b5cf6" />
                    <Text className="ml-3 text-gray-700">Responder dudas financieras</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Chat messages */}
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
            {isTyping && (
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
                onFocus={scrollToBottom}
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isTyping}
              className={`p-3 rounded-full ${
                inputText.trim() && !isTyping
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isTyping ? "white" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
