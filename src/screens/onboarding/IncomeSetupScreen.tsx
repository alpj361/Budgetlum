import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import InputField from "../../components/onboarding/InputField";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type IncomeSetupScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "IncomeSetup">;

const frequencyOptions = [
  {
    id: "weekly",
    title: "Semanal",
    description: "Cada semana",
    icon: "calendar" as const,
  },
  {
    id: "bi-weekly",
    title: "Quincenal",
    description: "Cada 15 días",
    icon: "calendar" as const,
  },
  {
    id: "monthly",
    title: "Mensual",
    description: "Una vez al mes",
    icon: "calendar-outline" as const,
  },
  {
    id: "irregular",
    title: "Irregular",
    description: "Variable o por proyecto",
    icon: "shuffle" as const,
  },
];

export default function IncomeSetupScreen() {
  const navigation = useNavigation<IncomeSetupScreenNavigationProp>();
  const { updateProfile, addIncome, setOnboardingStep } = useUserStore();

  const [incomeName, setIncomeName] = useState("Trabajo principal");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!incomeName.trim()) {
      newErrors.incomeName = "El nombre del ingreso es obligatorio";
    }

    if (!incomeAmount.trim()) {
      newErrors.incomeAmount = "El monto es obligatorio";
    } else {
      const amount = parseFloat(incomeAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.incomeAmount = "Ingresa un monto válido";
      }
    }

    if (!frequency) {
      newErrors.frequency = "Selecciona la frecuencia de pago";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    // Add the primary income
    addIncome({
      name: incomeName.trim(),
      amount: parseFloat(incomeAmount),
      frequency: frequency as any,
      isActive: true,
      isPrimary: true,
    });

    // Update profile with primary income info
    updateProfile({
      primaryIncome: parseFloat(incomeAmount),
      payFrequency: frequency as any,
    });

    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const handleBack = () => {
    setOnboardingStep(1);
    navigation.goBack();
  };

  const handleSkip = () => {
    // Skip income setup and go to next step
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const canProceed = incomeName.trim() && incomeAmount.trim() && frequency && !Object.keys(errors).length;

  // Calculate estimated monthly income for display
  const estimatedMonthly = (() => {
    const amount = parseFloat(incomeAmount) || 0;
    switch (frequency) {
      case "weekly": return amount * 4.33;
      case "bi-weekly": return amount * 2.17;
      case "monthly": return amount;
      case "irregular": return amount;
      default: return 0;
    }
  })();

  return (
    <OnboardingContainer
      title="Configuremos tus ingresos"
      subtitle="Esto nos ayudará a crear presupuestos realistas para ti"
      currentStep={2}
      totalSteps={6}
      onNext={handleNext}
      onBack={handleBack}
      nextButtonText="Continuar"
      nextDisabled={!canProceed}
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        {/* Income Details Section */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Ingreso principal
          </Text>

          <InputField
            label="Nombre del ingreso"
            placeholder="Ej: Trabajo principal, Freelance..."
            value={incomeName}
            onChangeText={(text) => {
              setIncomeName(text);
              if (errors.incomeName) {
                setErrors({ ...errors, incomeName: "" });
              }
            }}
            icon="briefcase"
            error={errors.incomeName}
            required
          />

          <InputField
            label="Monto por pago"
            placeholder="0"
            value={incomeAmount}
            onChangeText={(text) => {
              // Only allow numbers and decimal point
              const numericText = text.replace(/[^0-9.]/g, '');
              setIncomeAmount(numericText);
              if (errors.incomeAmount) {
                setErrors({ ...errors, incomeAmount: "" });
              }
            }}
            keyboardType="decimal-pad"
            icon="cash"
            error={errors.incomeAmount}
            required
          />
        </View>

        {/* Frequency Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            ¿Con qué frecuencia recibes este ingreso?
          </Text>

          {frequencyOptions.map((option) => (
            <SelectionCard
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              isSelected={frequency === option.id}
              onPress={() => {
                setFrequency(option.id);
                if (errors.frequency) {
                  setErrors({ ...errors, frequency: "" });
                }
              }}
            />
          ))}

          {errors.frequency && (
            <Text className="text-red-500 text-sm mt-2 ml-1">
              {errors.frequency}
            </Text>
          )}
        </View>

        {/* Estimated Monthly Display */}
        {estimatedMonthly > 0 && (
          <View className="p-4 bg-green-50 rounded-xl mb-6">
            <Text className="text-green-800 font-medium text-center">
              💰 Ingreso mensual estimado: ${estimatedMonthly.toLocaleString()}
            </Text>
            <Text className="text-green-600 text-sm text-center mt-1">
              Podrás agregar más fuentes de ingreso después
            </Text>
          </View>
        )}

        {/* Info Note */}
        <View className="flex-1 justify-end">
          <View className="p-4 bg-blue-50 rounded-xl">
            <Text className="text-blue-800 text-sm text-center">
              📊 Esta información nos ayudará a sugerir presupuestos realistas
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}