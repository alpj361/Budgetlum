import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "../../components/AnimatedPressable";
import { getBussyWelcomeMessage } from "../../api/chat-service";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { setOnboardingStep } = useUserStore();

  const handleNext = () => {
    setOnboardingStep(1);
    navigation.navigate("PersonalInfo");
  };

  const handleSkipToMain = () => {
    // Skip onboarding completely and go to main app
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" as any }],
    });
  };

  return (
    <OnboardingContainer
      title="¡Bienvenido a Budgetlum!"
      subtitle="Tu compañero inteligente para el control financiero personal"
      currentStep={0}
      totalSteps={6}
      onNext={handleNext}
      nextButtonText="Empezar configuración"
      showSkip={true}
      onSkip={handleSkipToMain}
    >
      <View className="flex-1 items-center justify-center">
        {/* Main Illustration Area */}
        <View className="items-center mb-12">
          <View className="w-32 h-32 bg-blue-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="wallet" size={64} color="#3b82f6" />
          </View>

          <Text className="text-xl text-gray-700 text-center mb-4 px-4">
            Conoce a <Text className="font-bold text-blue-600">Bussy</Text>, tu asistente financiero personal
          </Text>

          <Text className="text-gray-600 text-center px-4 leading-6">
            Te ayudará a crear presupuestos inteligentes, analizar tus gastos y alcanzar tus metas financieras
          </Text>
        </View>

        {/* Features Grid */}
        <View className="w-full">
          <View className="flex-row flex-wrap justify-between px-2">
            <FeatureCard
              icon="analytics"
              title="Análisis inteligente"
              description="Insights personalizados"
            />
            <FeatureCard
              icon="target"
              title="Metas claras"
              description="Alcanza tus objetivos"
            />
            <FeatureCard
              icon="shield-checkmark"
              title="Datos seguros"
              description="Información protegida"
            />
            <FeatureCard
              icon="chatbubbles"
              title="Asistente IA"
              description="Consejos personalizados"
            />
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <View className="w-[48%] p-4 bg-gray-50 rounded-xl mb-3">
      <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mb-3">
        <Ionicons name={icon} size={16} color="#3b82f6" />
      </View>
      <Text className="font-semibold text-gray-900 text-sm mb-1">{title}</Text>
      <Text className="text-gray-600 text-xs">{description}</Text>
    </View>
  );
}