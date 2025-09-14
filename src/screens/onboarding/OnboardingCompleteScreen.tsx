import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getBussyWelcomeMessage } from "../../api/chat-service";

type OnboardingCompleteScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "OnboardingComplete">;

export default function OnboardingCompleteScreen() {
  const navigation = useNavigation<OnboardingCompleteScreenNavigationProp>();
  const { completeOnboarding, userProfile } = useUserStore();

  const [bussyMessage, setBussyMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBussyWelcomeMessage();
  }, []);

  const loadBussyWelcomeMessage = async () => {
    try {
      const message = await getBussyWelcomeMessage(userProfile);
      setBussyMessage(message);
    } catch (error) {
      console.error("Error loading Bussy message:", error);
      setBussyMessage(
        `¡Hola ${userProfile?.name || ""}! 👋 Soy Bussy, tu asistente financiero personal. Estoy emocionado de ayudarte a alcanzar tus metas financieras. ¡Empecemos a tomar control de tus finanzas juntos!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    completeOnboarding();

    // Reset navigation to main app
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" as any }],
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <OnboardingContainer
      title="¡Todo listo!"
      subtitle="Es hora de conocer a tu asistente financiero personal"
      currentStep={6}
      totalSteps={6}
      onNext={handleComplete}
      onBack={handleBack}
      nextButtonText="Empezar a usar Budgetlum"
      showProgress={false}
    >
      <View className="flex-1">
        {/* Bussy Introduction */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-4">
            <Ionicons name="chatbubbles" size={40} color="white" />
          </View>

          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Conoce a Bussy
          </Text>

          <Text className="text-gray-600 text-center mb-6">
            Tu asistente de IA especializado en finanzas personales
          </Text>
        </View>

        {/* Bussy's Message */}
        <View className="bg-blue-50 rounded-2xl p-6 mb-8">
          <View className="flex-row mb-4">
            <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="chatbubbles" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-blue-900 mb-1">Bussy</Text>
              <Text className="text-blue-700 text-sm">Tu asistente financiero</Text>
            </View>
          </View>

          {isLoading ? (
            <View className="py-4">
              <Text className="text-blue-800 text-center">
                Preparando mensaje personalizado...
              </Text>
            </View>
          ) : (
            <Text className="text-blue-800 leading-6">
              {bussyMessage}
            </Text>
          )}
        </View>

        {/* What's Next */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            ¿Qué puedes hacer ahora?
          </Text>

          <View className="space-y-3">
            <FeatureItem
              icon="add-circle"
              title="Registrar gastos"
              description="Empieza agregando tus primeros gastos"
            />

            <FeatureItem
              icon="wallet"
              title="Crear presupuestos"
              description="Configura límites para tus categorías"
            />

            <FeatureItem
              icon="chatbubbles"
              title="Chatear con Bussy"
              description="Pide consejos personalizados cuando quieras"
            />
          </View>
        </View>

        {/* Summary Stats */}
        <View className="bg-green-50 rounded-xl p-6">
          <Text className="text-green-800 font-semibold text-center mb-2">
            🎉 ¡Configuración completada!
          </Text>
          <Text className="text-green-700 text-sm text-center">
            {userProfile?.name ? `¡Bienvenido/a ${userProfile.name}! ` : ""}
            Tu perfil financiero está listo y Bussy ya puede darte consejos personalizados.
          </Text>
        </View>
      </View>
    </OnboardingContainer>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View className="flex-row items-center p-3 bg-gray-50 rounded-xl">
      <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#6b7280" />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-gray-900">{title}</Text>
        <Text className="text-gray-600 text-sm">{description}</Text>
      </View>
    </View>
  );
}