import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import InputField from "../../components/onboarding/InputField";
import SelectionCard from "../../components/onboarding/SelectionCard";
import PaymentPatternSelector from "../../components/onboarding/PaymentPatternSelector";
import PaymentCycleEditor from "../../components/onboarding/PaymentCycleEditor";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PaymentCycle } from "../../types/user";
import {
  calculateMonthlyIncome,
  createDefaultCycles,
  validatePaymentCycles,
  getIncomePreviewText,
} from "../../utils/incomeCalculations";

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
  const [paymentPattern, setPaymentPattern] = useState<"simple" | "complex" | "">("");
  const [cycles, setCycles] = useState<PaymentCycle[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!incomeName.trim()) {
      newErrors.incomeName = "El nombre del ingreso es obligatorio";
    }

    if (!frequency) {
      newErrors.frequency = "Selecciona la frecuencia de pago";
    }

    if (!paymentPattern) {
      newErrors.paymentPattern = "Selecciona cómo recibes el ingreso";
    }

    // Validate based on payment pattern
    if (paymentPattern === "simple") {
      if (!incomeAmount.trim()) {
        newErrors.incomeAmount = "El monto es obligatorio";
      } else {
        const amount = parseFloat(incomeAmount);
        if (isNaN(amount) || amount <= 0) {
          newErrors.incomeAmount = "Ingresa un monto válido";
        }
      }
    } else if (paymentPattern === "complex") {
      const cycleErrors = validatePaymentCycles(cycles, frequency);
      if (cycleErrors.length > 0) {
        newErrors.cycles = cycleErrors[0]; // Show first error
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    // Create income source based on pattern
    const incomeSource = {
      name: incomeName.trim(),
      amount: paymentPattern === "simple" ? parseFloat(incomeAmount) : 0,
      frequency: frequency as any,
      isActive: true,
      isPrimary: true,
      paymentPattern: paymentPattern as "simple" | "complex",
      cycles: paymentPattern === "complex" ? cycles : undefined,
    };

    // Calculate monthly income for profile
    const monthlyIncome = calculateMonthlyIncome(incomeSource as any);

    // Add the primary income
    addIncome(incomeSource as any);

    // Update profile with primary income info
    updateProfile({
      primaryIncome: monthlyIncome,
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

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency);
    setPaymentPattern(""); // Reset pattern when frequency changes
    setCycles([]); // Reset cycles
    if (errors.frequency) {
      setErrors({ ...errors, frequency: "" });
    }
  };

  const handlePatternChange = (pattern: "simple" | "complex") => {
    setPaymentPattern(pattern);

    if (pattern === "complex" && frequency && incomeAmount) {
      // Initialize with default cycles based on entered amount
      const defaultCycles = createDefaultCycles(frequency, parseFloat(incomeAmount) || 100);
      setCycles(defaultCycles);
    }

    if (errors.paymentPattern) {
      setErrors({ ...errors, paymentPattern: "" });
    }
  };

  const canProceed = incomeName.trim() &&
    frequency &&
    paymentPattern &&
    ((paymentPattern === "simple" && incomeAmount.trim()) || (paymentPattern === "complex" && cycles.length > 0)) &&
    !Object.keys(errors).length;

  // Calculate estimated monthly income for display
  const estimatedMonthly = (() => {
    if (!paymentPattern || !frequency) return 0;

    if (paymentPattern === "simple" && incomeAmount) {
      const tempIncome = {
        amount: parseFloat(incomeAmount),
        frequency: frequency as any,
        paymentPattern: "simple" as const,
      };
      return calculateMonthlyIncome(tempIncome as any);
    }

    if (paymentPattern === "complex" && cycles.length > 0) {
      const tempIncome = {
        amount: 0,
        frequency: frequency as any,
        paymentPattern: "complex" as const,
        cycles: cycles,
      };
      return calculateMonthlyIncome(tempIncome as any);
    }

    return 0;
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

          {paymentPattern === "simple" && (
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
          )}
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
              onPress={() => handleFrequencyChange(option.id)}
            />
          ))}

          {errors.frequency && (
            <Text className="text-red-500 text-sm mt-2 ml-1">
              {errors.frequency}
            </Text>
          )}
        </View>

        {/* Payment Pattern Section */}
        {frequency && (
          <>
            <PaymentPatternSelector
              selectedPattern={paymentPattern}
              onPatternChange={handlePatternChange}
              frequency={frequency}
            />

            {errors.paymentPattern && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.paymentPattern}
              </Text>
            )}
          </>
        )}

        {/* Complex Payment Cycles */}
        {paymentPattern === "complex" && (
          <>
            <PaymentCycleEditor
              frequency={frequency}
              cycles={cycles}
              onCyclesChange={(newCycles) => {
                setCycles(newCycles);
                if (errors.cycles) {
                  setErrors({ ...errors, cycles: "" });
                }
              }}
            />

            {errors.cycles && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.cycles}
              </Text>
            )}
          </>
        )}

        {/* Estimated Monthly Display */}
        {estimatedMonthly > 0 && (
          <View className="p-4 bg-green-50 rounded-xl mb-6">
            <Text className="text-green-800 font-medium text-center">
              💰 Ingreso mensual estimado: ${estimatedMonthly.toLocaleString()}
            </Text>
            <Text className="text-green-600 text-sm text-center mt-1">
              {paymentPattern === "complex" ?
                "Basado en tu patrón de pagos variable" :
                "Podrás agregar más fuentes de ingreso después"
              }
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