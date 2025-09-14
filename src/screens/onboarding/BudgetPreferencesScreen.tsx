import React, { useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type BudgetPreferencesScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "BudgetPreferences">;

const experienceOptions = [
  {
    id: "beginner",
    title: "Principiante",
    description: "Es mi primera vez haciendo un presupuesto",
    icon: "leaf" as const,
  },
  {
    id: "intermediate",
    title: "Intermedio",
    description: "He intentado presupuestos antes, pero necesito ayuda",
    icon: "trending-up" as const,
  },
  {
    id: "advanced",
    title: "Avanzado",
    description: "Tengo experiencia con presupuestos y finanzas",
    icon: "trophy" as const,
  },
];

const periodOptions = [
  {
    id: "monthly",
    title: "Mensual",
    description: "Presupuesto cada mes",
    icon: "calendar" as const,
  },
  {
    id: "bi-monthly",
    title: "Bimestral",
    description: "Presupuesto cada 2 meses",
    icon: "calendar-outline" as const,
  },
  {
    id: "quarterly",
    title: "Trimestral",
    description: "Presupuesto cada 3 meses",
    icon: "calendar" as const,
  },
];

export default function BudgetPreferencesScreen() {
  const navigation = useNavigation<BudgetPreferencesScreenNavigationProp>();
  const { updateProfile, setOnboardingStep } = useUserStore();

  const [experience, setExperience] = useState<string>("");
  const [period, setPeriod] = useState<string>("monthly");

  const handleNext = () => {
    updateProfile({
      budgetingExperience: experience as any,
      preferredBudgetPeriod: period as any,
    });

    setOnboardingStep(6);
    navigation.navigate("OnboardingComplete");
  };

  const handleBack = () => {
    setOnboardingStep(4);
    navigation.goBack();
  };

  const canProceed = !!experience;

  return (
    <OnboardingContainer
      title="Preferencias de presupuesto"
      subtitle="Configuremos el sistema que mejor funcione para ti"
      currentStep={5}
      totalSteps={6}
      onNext={handleNext}
      onBack={handleBack}
      nextButtonText="Continuar"
      nextDisabled={!canProceed}
    >
      <View className="flex-1">
        {/* Experience Level */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Tu experiencia con presupuestos
          </Text>

          {experienceOptions.map((option) => (
            <SelectionCard
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              isSelected={experience === option.id}
              onPress={() => setExperience(option.id)}
            />
          ))}
        </View>

        {/* Budget Period */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            ¿Con qué frecuencia quieres planificar tu presupuesto?
          </Text>

          {periodOptions.map((option) => (
            <SelectionCard
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              isSelected={period === option.id}
              onPress={() => setPeriod(option.id)}
            />
          ))}
        </View>

        <View className="flex-1 justify-end mt-4">
          <View className="p-4 bg-indigo-50 rounded-xl">
            <Text className="text-indigo-800 font-medium text-center">
              🎉 ¡Ya casi terminamos! Solo queda conocer a Bussy
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}