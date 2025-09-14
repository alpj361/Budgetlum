import React, { useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type ExpenseProfileScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "ExpenseProfile">;

const spendingStyleOptions = [
  {
    id: "conservative",
    title: "Conservador",
    description: "Prefiero ahorrar y gastar solo lo necesario",
    icon: "shield-checkmark" as const,
  },
  {
    id: "moderate",
    title: "Moderado",
    description: "Balance entre ahorros y gastos personales",
    icon: "balance-scale" as const,
  },
  {
    id: "flexible",
    title: "Flexible",
    description: "Me gusta disfrutar la vida y gastar en experiencias",
    icon: "happy" as const,
  },
];

export default function ExpenseProfileScreen() {
  const navigation = useNavigation<ExpenseProfileScreenNavigationProp>();
  const { updateProfile, setOnboardingStep } = useUserStore();

  const [spendingStyle, setSpendingStyle] = useState<string>("");

  const handleNext = () => {
    updateProfile({
      spendingStyle: spendingStyle as any,
    });

    setOnboardingStep(4);
    navigation.navigate("Goals");
  };

  const handleBack = () => {
    setOnboardingStep(2);
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(4);
    navigation.navigate("Goals");
  };

  const canProceed = !!spendingStyle;

  return (
    <OnboardingContainer
      title="Tu estilo de gasto"
      subtitle="Conocer tus preferencias nos ayuda a darte mejores consejos"
      currentStep={3}
      totalSteps={6}
      onNext={handleNext}
      onBack={handleBack}
      nextButtonText="Continuar"
      nextDisabled={!canProceed}
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-900 mb-6">
          ¿Cómo describes tu enfoque hacia el gasto?
        </Text>

        {spendingStyleOptions.map((option) => (
          <SelectionCard
            key={option.id}
            title={option.title}
            description={option.description}
            icon={option.icon}
            isSelected={spendingStyle === option.id}
            onPress={() => setSpendingStyle(option.id)}
          />
        ))}

        <View className="flex-1 justify-end mt-8">
          <View className="p-4 bg-purple-50 rounded-xl">
            <Text className="text-purple-800 font-medium text-center">
              🎯 No hay respuestas incorrectas - esto es solo para personalizar tu experiencia
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}