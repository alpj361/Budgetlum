import React, { useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import InputField from "../../components/onboarding/InputField";

type GoalsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Goals">;

export default function GoalsScreen() {
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const { addGoal, setOnboardingStep } = useUserStore();

  const [emergencyFundAmount, setEmergencyFundAmount] = useState("");

  const handleNext = () => {
    // Add emergency fund goal if amount is provided
    if (emergencyFundAmount && parseFloat(emergencyFundAmount) > 0) {
      addGoal({
        title: "Fondo de emergencia",
        description: "Dinero guardado para imprevistos",
        targetAmount: parseFloat(emergencyFundAmount),
        currentAmount: 0,
        priority: "high",
        type: "emergency_fund",
        isActive: true,
      });
    }

    setOnboardingStep(5);
    navigation.navigate("BudgetPreferences");
  };

  const handleBack = () => {
    setOnboardingStep(3);
    navigation.goBack();
  };

  const handleSkip = () => {
    setOnboardingStep(5);
    navigation.navigate("BudgetPreferences");
  };

  return (
    <OnboardingContainer
      title="Tus metas financieras"
      subtitle="Definir objetivos claros te ayudará a mantenerte motivado"
      currentStep={4}
      totalSteps={6}
      onNext={handleNext}
      onBack={handleBack}
      nextButtonText="Continuar"
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-900 mb-6">
          Empecemos con lo básico: tu fondo de emergencia
        </Text>

        <View className="p-4 bg-orange-50 rounded-xl mb-6">
          <Text className="text-orange-800 font-medium mb-2">
            💡 ¿Qué es un fondo de emergencia?
          </Text>
          <Text className="text-orange-700 text-sm">
            Es dinero guardado para cubrir gastos inesperados como reparaciones, gastos médicos o pérdida de empleo. Los expertos recomiendan tener 3-6 meses de gastos guardados.
          </Text>
        </View>

        <InputField
          label="¿Cuánto te gustaría tener guardado? (opcional)"
          placeholder="Ej: 50000"
          value={emergencyFundAmount}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '');
            setEmergencyFundAmount(numericText);
          }}
          keyboardType="numeric"
          icon="shield-checkmark"
          hint="Puedes cambiar esta meta más tarde"
        />

        <View className="flex-1 justify-end mt-8">
          <View className="p-4 bg-green-50 rounded-xl">
            <Text className="text-green-800 text-sm text-center">
              🚀 Podrás agregar más metas después: viajes, compras importantes, inversiones, etc.
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}