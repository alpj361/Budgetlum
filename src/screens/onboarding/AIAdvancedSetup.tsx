import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConversationStore } from "../../state/conversationStore";
import { useUserStore } from "../../state/userStore";
import { getBussyAdvancedWelcome } from "../../api/chat-service";
import AnimatedPressable from "../../components/AnimatedPressable";

interface AIAdvancedSetupProps {
  navigation: any;
}

export default function AIAdvancedSetup({ navigation }: AIAdvancedSetupProps) {
  const { userProfile, updateProfile } = useUserStore();
  const {
    setMode,
    updateConversationStep,
    getCurrentStepProgress,
    advancedModeState
  } = useConversationStore();

  const [isInitializing, setIsInitializing] = useState(false);

  const startAIBudgetSetup = async () => {
    setIsInitializing(true);

    try {
      // Set preference for AI mode
      updateProfile({
        budgetSetupMethod: 'ai',
        enableBussyGuidance: true
      });

      // Initialize Advanced Mode
      setMode('advanced');
      updateConversationStep('WELCOME');

      // Navigate to AI Chat
      navigation.navigate('MainTabs', { screen: 'AI Chat' });

    } catch (error) {
      console.error("Error starting AI budget setup:", error);
      Alert.alert(
        "Error",
        "No se pudo inicializar la configuración con IA. Inténtalo de nuevo.",
        [{ text: "OK" }]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const useManualSetup = () => {
    updateProfile({
      budgetSetupMethod: 'ui',
      enableBussyGuidance: false
    });

    // Continue with traditional onboarding
    navigation.navigate('UIBudgetSetup');
  };

  const skipBudgetSetup = () => {
    updateProfile({
      budgetSetupMethod: 'skip',
      hasSetupBudget: false
    });

    // Complete onboarding without budget setup
    navigation.navigate('OnboardingComplete');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="items-center pt-8 pb-6">
          <View className="bg-blue-100 rounded-full w-20 h-20 items-center justify-center mb-4">
            <Ionicons name="construct" size={40} color="#3b82f6" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            Configuración de Presupuesto
          </Text>
          <Text className="text-gray-600 text-center leading-6">
            Elige cómo quieres configurar tu presupuesto
          </Text>
        </View>

        {/* Options */}
        <View className="flex-1">
          {/* AI Setup Option */}
          <View className="mb-6">
            <View className="bg-gradient-to-r from-blue-500 to-green-500 rounded-xl p-6 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="sparkles" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Configuración Inteligente
                </Text>
                <View className="bg-green-400 rounded-full px-2 py-1 ml-2">
                  <Text className="text-white text-xs font-medium">
                    RECOMENDADO
                  </Text>
                </View>
              </View>
              <Text className="text-white mb-4 leading-6">
                Nuestro asistente de IA te guiará paso a paso para crear un presupuesto personalizado basado en tus ingresos y gastos. Rápido, fácil y eficiente.
              </Text>

              <View className="space-y-2 mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text className="text-white text-sm ml-2">
                    Análisis automático de ingresos
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text className="text-white text-sm ml-2">
                    Presupuesto basado en mejores prácticas
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text className="text-white text-sm ml-2">
                    Configuración en menos de 5 minutos
                  </Text>
                </View>
              </View>

              <AnimatedPressable
                onPress={startAIBudgetSetup}
                disabled={isInitializing}
                className="bg-white rounded-lg py-4 px-6"
              >
                {isInitializing ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text className="text-blue-600 font-semibold ml-2">
                      Iniciando...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-blue-600 font-semibold text-center">
                    Comenzar con IA
                  </Text>
                )}
              </AnimatedPressable>
            </View>
          </View>

          {/* Manual Setup Option */}
          <View className="mb-6">
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="create-outline" size={24} color="#6b7280" />
                <Text className="text-gray-900 font-bold text-lg ml-2">
                  Configuración Manual
                </Text>
              </View>
              <Text className="text-gray-600 mb-4 leading-6">
                Configura tu presupuesto manualmente usando nuestra interfaz tradicional. Tendrás control total sobre cada categoría y límite.
              </Text>

              <AnimatedPressable
                onPress={useManualSetup}
                className="bg-gray-600 rounded-lg py-4 px-6"
              >
                <Text className="text-white font-semibold text-center">
                  Configurar Manualmente
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="pb-6">
          <TouchableOpacity
            onPress={skipBudgetSetup}
            className="py-3"
          >
            <Text className="text-gray-500 text-center">
              Omitir configuración de presupuesto
            </Text>
          </TouchableOpacity>

          <Text className="text-gray-400 text-xs text-center mt-4">
            Podrás cambiar tu método de configuración en cualquier momento desde la configuración
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}