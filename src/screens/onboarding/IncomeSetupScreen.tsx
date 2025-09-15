import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import InputField from "../../components/onboarding/InputField";
import SelectionCard from "../../components/onboarding/SelectionCard";
import PaymentPatternSelector from "../../components/onboarding/PaymentPatternSelector";
import PaymentCycleEditor from "../../components/onboarding/PaymentCycleEditor";
import IncomeStabilitySelector from "../../components/onboarding/IncomeStabilitySelector";
import IncomeRangeCollector from "../../components/onboarding/IncomeRangeCollector";
import ConversationalGuidance from "../../components/onboarding/ConversationalGuidance";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PaymentCycle, IncomeRange } from "../../types/user";
import {
  calculateMonthlyIncome,
  createDefaultCycles,
  validatePaymentCycles,
  validateIncomeRange,
  createIncomeSourceFromStability,
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

  // Flow state
  const [currentStep, setCurrentStep] = useState<"intro" | "frequency" | "stability" | "amount" | "pattern" | "cycles">("intro");

  // Form data
  const [incomeName, setIncomeName] = useState("Trabajo principal");
  const [frequency, setFrequency] = useState<string>("");
  const [stabilityPattern, setStabilityPattern] = useState<"consistent" | "seasonal" | "variable" | "">("");

  // Simple income
  const [incomeAmount, setIncomeAmount] = useState("");

  // Variable income
  const [incomeRange, setIncomeRange] = useState<IncomeRange>({
    lowest: 0,
    highest: 0,
    averageLow: 0,
  });

  // Complex patterns (existing)
  const [paymentPattern, setPaymentPattern] = useState<"simple" | "complex" | "">("");
  const [cycles, setCycles] = useState<PaymentCycle[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateCurrentStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (currentStep) {
      case "intro":
        if (!incomeName.trim()) {
          newErrors.incomeName = "El nombre del ingreso es obligatorio";
        }
        break;

      case "frequency":
        if (!frequency) {
          newErrors.frequency = "Selecciona la frecuencia de pago";
        }
        break;

      case "stability":
        if (!stabilityPattern) {
          newErrors.stabilityPattern = "Selecciona cómo es tu ingreso";
        }
        break;

      case "amount":
        if (stabilityPattern === "consistent") {
          if (!incomeAmount.trim()) {
            newErrors.incomeAmount = "El monto es obligatorio";
          } else {
            const amount = parseFloat(incomeAmount);
            if (isNaN(amount) || amount <= 0) {
              newErrors.incomeAmount = "Ingresa un monto válido";
            }
          }
        } else if (stabilityPattern === "seasonal" || stabilityPattern === "variable") {
          const rangeErrors = validateIncomeRange(incomeRange);
          if (rangeErrors.length > 0) {
            newErrors.lowestIncome = rangeErrors[0];
          }
        }
        break;

      case "pattern":
        if (!paymentPattern) {
          newErrors.paymentPattern = "Selecciona cómo recibes el ingreso";
        }
        break;

      case "cycles":
        if (paymentPattern === "complex") {
          const cycleErrors = validatePaymentCycles(cycles, frequency);
          if (cycleErrors.length > 0) {
            newErrors.cycles = cycleErrors[0];
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getNextStep = (): string | null => {
    switch (currentStep) {
      case "intro": return "frequency";
      case "frequency": return "stability";
      case "stability": return "amount";
      case "amount":
        // For consistent income, might go to pattern selection or finish
        if (stabilityPattern === "consistent") {
          return frequency === "irregular" ? null : "pattern";
        }
        return null; // Variable/seasonal income goes straight to completion
      case "pattern":
        return paymentPattern === "complex" ? "cycles" : null;
      case "cycles": return null;
      default: return null;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    const nextStep = getNextStep();

    if (nextStep) {
      setCurrentStep(nextStep as any);
      setErrors({}); // Clear errors when advancing
    } else {
      // Final submission
      submitIncomeData();
    }
  };

  const submitIncomeData = () => {
    // Create income source based on current data
    const incomeSourceData = createIncomeSourceFromStability(
      incomeName,
      frequency,
      stabilityPattern!,
      parseFloat(incomeAmount) || undefined,
      stabilityPattern !== "consistent" ? incomeRange : undefined
    );

    // Add cycles if complex pattern
    if (paymentPattern === "complex" && cycles.length > 0) {
      (incomeSourceData as any).paymentPattern = "complex";
      (incomeSourceData as any).cycles = cycles;
    }

    // Calculate monthly income for profile
    const monthlyIncome = calculateMonthlyIncome(incomeSourceData as any);

    // Add the primary income
    addIncome(incomeSourceData as any);

    // Update profile with primary income info
    updateProfile({
      primaryIncome: monthlyIncome,
      payFrequency: frequency as any,
    });

    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const handleBack = () => {
    const previousSteps = {
      "frequency": "intro",
      "stability": "frequency",
      "amount": "stability",
      "pattern": "amount",
      "cycles": "pattern",
    };

    const prevStep = previousSteps[currentStep as keyof typeof previousSteps];

    if (prevStep) {
      setCurrentStep(prevStep as any);
      setErrors({});
    } else {
      setOnboardingStep(1);
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  // Dynamic handlers
  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency);
    setPaymentPattern("");
    setCycles([]);
    if (errors.frequency) {
      setErrors({ ...errors, frequency: "" });
    }
  };

  const handleStabilityChange = (stability: "consistent" | "seasonal" | "variable") => {
    setStabilityPattern(stability);
    // Reset dependent fields
    setIncomeAmount("");
    setIncomeRange({ lowest: 0, highest: 0, averageLow: 0 });
    if (errors.stabilityPattern) {
      setErrors({ ...errors, stabilityPattern: "" });
    }
  };

  const handlePatternChange = (pattern: "simple" | "complex") => {
    setPaymentPattern(pattern);

    if (pattern === "complex" && frequency && incomeAmount) {
      const defaultCycles = createDefaultCycles(frequency, parseFloat(incomeAmount) || 100);
      setCycles(defaultCycles);
    }

    if (errors.paymentPattern) {
      setErrors({ ...errors, paymentPattern: "" });
    }
  };

  // Calculate estimated monthly income for display
  const getEstimatedMonthly = (): number => {
    if (stabilityPattern === "consistent" && incomeAmount) {
      const tempIncome = createIncomeSourceFromStability(
        incomeName,
        frequency,
        "consistent",
        parseFloat(incomeAmount)
      );
      return calculateMonthlyIncome(tempIncome as any);
    }

    if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && incomeRange.averageLow > 0) {
      const tempIncome = createIncomeSourceFromStability(
        incomeName,
        frequency,
        stabilityPattern,
        undefined,
        incomeRange
      );
      return calculateMonthlyIncome(tempIncome as any);
    }

    return 0;
  };

  const estimatedMonthly = getEstimatedMonthly();

  // Memoized validation to prevent infinite re-renders
  const canProceed = React.useMemo(() => {
    return validateCurrentStepSilent();
  }, [currentStep, incomeName, frequency, stabilityPattern, incomeAmount, incomeRange, paymentPattern, cycles]);

  // Silent validation that doesn't set errors
  const validateCurrentStepSilent = (): boolean => {
    switch (currentStep) {
      case "intro":
        return !!incomeName.trim();

      case "frequency":
        return !!frequency;

      case "stability":
        return !!stabilityPattern;

      case "amount":
        if (stabilityPattern === "consistent") {
          const amount = parseFloat(incomeAmount);
          return !!incomeAmount.trim() && !isNaN(amount) && amount > 0;
        } else if (stabilityPattern === "seasonal" || stabilityPattern === "variable") {
          return incomeRange.lowest > 0 && incomeRange.highest > 0 && incomeRange.highest > incomeRange.lowest;
        }
        return false;

      case "pattern":
        return !!paymentPattern;

      case "cycles":
        if (paymentPattern === "complex") {
          return cycles.length > 0 && cycles.every(c => c.amount > 0);
        }
        return true;

      default:
        return false;
    }
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case "intro": return "Hablemos de tu ingreso principal";
      case "frequency": return "¿Con qué frecuencia te pagan?";
      case "stability": return "¿Cómo es tu ingreso mes a mes?";
      case "amount":
        return stabilityPattern === "consistent"
          ? "¿Cuánto recibes por pago?"
          : "Cuéntanos sobre tu rango de ingresos";
      case "pattern": return "¿Cómo recibes este ingreso?";
      case "cycles": return "Configura tus pagos del ciclo";
      default: return "Configuremos tu ingreso";
    }
  };

  const getNextButtonText = (): string => {
    const nextStep = getNextStep();
    return nextStep ? "Continuar" : "Finalizar configuración";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "intro":
        return (
          <View className="flex-1">
            <ConversationalGuidance type="intro" />

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Empecemos con lo básico
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
            </View>

            <ConversationalGuidance type="foundation" />
          </View>
        );

      case "frequency":
        return (
          <View className="flex-1">
            <View className="mb-6">
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
          </View>
        );

      case "stability":
        return (
          <View className="flex-1">
            <IncomeStabilitySelector
              selectedStability={stabilityPattern}
              onStabilityChange={handleStabilityChange}
            />

            {errors.stabilityPattern && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.stabilityPattern}
              </Text>
            )}

            {stabilityPattern && (
              <ConversationalGuidance
                type="stability"
                stabilityPattern={stabilityPattern}
              />
            )}
          </View>
        );

      case "amount":
        return (
          <View className="flex-1">
            {stabilityPattern === "consistent" ? (
              <InputField
                label="Monto por pago"
                placeholder="0"
                value={incomeAmount}
                onChangeText={(text) => {
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
            ) : (
              <IncomeRangeCollector
                stabilityPattern={stabilityPattern as "seasonal" | "variable"}
                frequency={frequency}
                incomeRange={incomeRange}
                onRangeChange={setIncomeRange}
                errors={errors}
              />
            )}
          </View>
        );

      case "pattern":
        return (
          <View className="flex-1">
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
          </View>
        );

      case "cycles":
        return (
          <View className="flex-1">
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
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingContainer
      title={getStepTitle()}
      subtitle="Vamos a crear la base sólida de tu presupuesto"
      currentStep={2}
      totalSteps={6}
      onNext={handleNext}
      onBack={currentStep !== "intro" ? handleBack : undefined}
      nextButtonText={getNextButtonText()}
      nextDisabled={!canProceed}
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        {renderStepContent()}

        {/* Success/Completion Preview */}
        {estimatedMonthly > 0 && currentStep !== "intro" && (
          <View className="mt-6">
            <ConversationalGuidance
              type="success"
              stabilityPattern={stabilityPattern}
              monthlyEstimate={estimatedMonthly}
            />
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}