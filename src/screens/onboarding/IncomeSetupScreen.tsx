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
import VariableIncomeTypeSelector from "../../components/onboarding/VariableIncomeTypeSelector";
import PaymentStructureSelector from "../../components/onboarding/PaymentStructureSelector";
import PaymentAmountConfigurator from "../../components/onboarding/PaymentAmountConfigurator";
import PaymentDateScheduler from "../../components/onboarding/PaymentDateScheduler";
import ConversationalGuidance from "../../components/onboarding/ConversationalGuidance";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PaymentCycle, IncomeRange, PaymentStructure, PaymentSchedule } from "../../types/user";
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

  // Redirect to new path selection screen
  React.useEffect(() => {
    navigation.replace("IncomePathSelection");
  }, [navigation]);

  // Flow state
  const [currentStep, setCurrentStep] = useState<"intro" | "payment-structure" | "payment-schedule" | "stability" | "variable-type" | "amount" | "pattern" | "cycles">("intro");

  // Form data
  const [incomeName, setIncomeName] = useState("Trabajo principal");
  const [frequency, setFrequency] = useState<string>(""); // Legacy support
  const [paymentStructure, setPaymentStructure] = useState<PaymentStructure | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [stabilityPattern, setStabilityPattern] = useState<"consistent" | "seasonal" | "variable" | "">("");
  const [variableType, setVariableType] = useState<"range" | "cycles" | "">("");

  // Payment amounts (for new structure system)
  const [paymentAmounts, setPaymentAmounts] = useState<number[]>([]);

  // Simple income (legacy)
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

      case "payment-structure":
        if (!paymentStructure) {
          newErrors.paymentStructure = "Selecciona cómo recibes tus pagos";
        }
        break;

      case "payment-schedule":
        if (!paymentSchedule) {
          newErrors.paymentSchedule = "Selecciona cuándo recibes tus pagos";
        }
        break;

      case "stability":
        if (!stabilityPattern) {
          newErrors.stabilityPattern = "Selecciona cómo es tu ingreso";
        }
        break;

      case "variable-type":
        if (!variableType) {
          newErrors.variableType = "Selecciona el tipo de variación";
        }
        break;

      case "amount":
        if (stabilityPattern === "consistent") {
          // For new payment structure system
          if (paymentStructure) {
            if (!paymentAmounts.length || paymentAmounts.every(amt => amt <= 0)) {
              newErrors.incomeAmount = "Ingresa al menos un monto válido";
            }
          } else {
            // Legacy validation
            if (!incomeAmount.trim()) {
              newErrors.incomeAmount = "El monto es obligatorio";
            } else {
              const amount = parseFloat(incomeAmount);
              if (isNaN(amount) || amount <= 0) {
                newErrors.incomeAmount = "Ingresa un monto válido";
              }
            }
          }
        } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "range") {
          const rangeErrors = validateIncomeRange(incomeRange);
          if (rangeErrors.length > 0) {
            newErrors.lowestIncome = rangeErrors[0];
          }
        } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "cycles") {
          // For variable cycles, check payment amounts or fallback to simple amount
          if (paymentStructure && paymentAmounts.length) {
            if (paymentAmounts.every(amt => amt <= 0)) {
              newErrors.incomeAmount = "Ingresa al menos un monto válido para tus ciclos";
            }
          } else if (!incomeAmount.trim()) {
            newErrors.incomeAmount = "Ingresa un monto de referencia para crear los ciclos";
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
      case "intro": return "payment-structure";

      case "payment-structure":
        // Smart flow based on payment structure
        if (!paymentStructure) return null;

        // Monthly payments: Skip schedule selection, go straight to stability
        if (paymentStructure.type === "monthly") {
          return "stability";
        }

        // All other frequencies: Need to set specific schedule
        return "payment-schedule";

      case "payment-schedule": return "stability";

      case "stability":
        // Variable/seasonal income needs to choose type first
        return (stabilityPattern === "seasonal" || stabilityPattern === "variable")
          ? "variable-type"
          : "amount";

      case "variable-type": return "amount";

      case "amount":
        // For consistent income with irregular structure, skip patterns
        if (stabilityPattern === "consistent" && paymentStructure?.type === "irregular") {
          return null; // Irregular goes straight to completion
        }

        // For variable income with cycles, might need pattern selection
        if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "cycles") {
          // Only show pattern selection for multi-payment structures
          if (paymentStructure && ["bi-monthly", "weekly"].includes(paymentStructure.type)) {
            return "pattern";
          }
          return null; // Simple variable cycles, go to completion
        }

        // For consistent income with multi-payment structures, might need patterns
        if (paymentStructure && ["bi-monthly"].includes(paymentStructure.type) && stabilityPattern === "consistent") {
          return "pattern";
        }

        return null; // Most cases go to completion

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
    let incomeSourceData: any;

    if (stabilityPattern === "consistent") {
      if (paymentStructure && paymentAmounts.length > 0) {
        // New payment structure system
        const totalAmount = paymentAmounts.reduce((sum, amt) => sum + amt, 0);
        incomeSourceData = {
          name: incomeName.trim(),
          frequency: frequency as any,
          paymentStructure: paymentStructure,
          paymentSchedule: paymentSchedule,
          stabilityPattern: "consistent",
          isActive: true,
          isPrimary: true,
          isFoundational: true,
          paymentPattern: "simple",
          amount: totalAmount,
          baseAmount: totalAmount,
        };
      } else {
        // Legacy fallback
        incomeSourceData = createIncomeSourceFromStability(
          incomeName,
          frequency,
          "consistent",
          parseFloat(incomeAmount) || undefined,
          undefined
        );
      }
    } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "range") {
      incomeSourceData = createIncomeSourceFromStability(
        incomeName,
        paymentStructure?.type || frequency,
        stabilityPattern,
        undefined,
        incomeRange
      );
    } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "cycles") {
      if (paymentStructure && paymentAmounts.length > 0) {
        // New payment structure with variable cycles
        const totalAmount = paymentAmounts.reduce((sum, amt) => sum + amt, 0);
        incomeSourceData = {
          name: incomeName.trim(),
          frequency: frequency as any,
          paymentStructure: paymentStructure,
          paymentSchedule: paymentSchedule,
          stabilityPattern: stabilityPattern,
          isActive: true,
          isPrimary: true,
          isFoundational: true,
          paymentPattern: paymentPattern === "complex" ? "complex" : "simple",
          amount: totalAmount,
          baseAmount: totalAmount,
        };
      } else {
        // Legacy fallback
        incomeSourceData = {
          name: incomeName.trim(),
          frequency: frequency as any,
          stabilityPattern: stabilityPattern,
          isActive: true,
          isPrimary: true,
          isFoundational: true,
          paymentPattern: paymentPattern === "complex" ? "complex" : "simple",
          amount: parseFloat(incomeAmount) || 0,
          baseAmount: parseFloat(incomeAmount) || 0,
        };
      }
    }

    // Add cycles if complex pattern
    if (paymentPattern === "complex" && cycles.length > 0) {
      incomeSourceData.paymentPattern = "complex";
      incomeSourceData.cycles = cycles;
    }

    // Calculate monthly income for profile
    const monthlyIncome = calculateMonthlyIncome(incomeSourceData);

    // Add the primary income
    addIncome(incomeSourceData);

    // Update profile with primary income info
    updateProfile({
      primaryIncome: monthlyIncome,
      payFrequency: paymentStructure?.type || frequency as any,
    });

    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const handleBack = () => {
    const previousSteps = {
      "payment-structure": "intro",
      "payment-schedule": "payment-structure",
      "stability": paymentStructure?.type === "monthly" ? "payment-structure" : "payment-schedule",
      "variable-type": "stability",
      "amount": (stabilityPattern === "seasonal" || stabilityPattern === "variable") ? "variable-type" : "stability",
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
  const handlePaymentStructureChange = (structure: PaymentStructure) => {
    setPaymentStructure(structure);
    setFrequency(structure.type); // Set legacy frequency for backward compatibility
    setPaymentSchedule(null); // Reset schedule when structure changes
    setPaymentAmounts([]);
    setPaymentPattern("");
    setCycles([]);
    if (errors.paymentStructure) {
      setErrors({ ...errors, paymentStructure: "" });
    }
  };

  const handlePaymentScheduleChange = (schedule: PaymentSchedule) => {
    setPaymentSchedule(schedule);
    if (errors.paymentSchedule) {
      setErrors({ ...errors, paymentSchedule: "" });
    }
  };

  const handleStabilityChange = (stability: "consistent" | "seasonal" | "variable") => {
    setStabilityPattern(stability);
    // Reset dependent fields
    setVariableType("");
    setIncomeAmount("");
    setIncomeRange({ lowest: 0, highest: 0, averageLow: 0 });
    if (errors.stabilityPattern) {
      setErrors({ ...errors, stabilityPattern: "" });
    }
  };

  const handleVariableTypeChange = (type: "range" | "cycles") => {
    setVariableType(type);
    // Reset dependent fields
    setIncomeAmount("");
    setIncomeRange({ lowest: 0, highest: 0, averageLow: 0 });
    setPaymentPattern("");
    setCycles([]);
    if (errors.variableType) {
      setErrors({ ...errors, variableType: "" });
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

  // Silent validation that doesn't set errors
  const validateCurrentStepSilent = (): boolean => {
    switch (currentStep) {
      case "intro":
        return !!incomeName.trim();

      case "payment-structure":
        return !!paymentStructure;

      case "payment-schedule":
        return !!paymentSchedule;

      case "stability":
        return !!stabilityPattern;

      case "variable-type":
        return !!variableType;

      case "amount":
        if (stabilityPattern === "consistent") {
          if (paymentStructure && paymentAmounts.length) {
            return paymentAmounts.some(amt => amt > 0);
          } else {
            const amount = parseFloat(incomeAmount);
            return !!incomeAmount.trim() && !isNaN(amount) && amount > 0;
          }
        } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "range") {
          return incomeRange.lowest > 0 && incomeRange.highest > 0 && incomeRange.highest > incomeRange.lowest;
        } else if ((stabilityPattern === "seasonal" || stabilityPattern === "variable") && variableType === "cycles") {
          if (paymentStructure && paymentAmounts.length) {
            return paymentAmounts.some(amt => amt > 0);
          } else {
            const amount = parseFloat(incomeAmount);
            return !!incomeAmount.trim() && !isNaN(amount) && amount > 0;
          }
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

  // Memoized validation to prevent infinite re-renders
  const canProceed = React.useMemo(() => {
    return validateCurrentStepSilent();
  }, [currentStep, incomeName, paymentStructure, paymentSchedule, stabilityPattern, variableType, incomeAmount, paymentAmounts, incomeRange, paymentPattern, cycles]);

  const getStepTitle = (): string => {
    switch (currentStep) {
      case "intro": return "Hablemos de tu ingreso principal";
      case "payment-structure": return "¿Con qué frecuencia te pagan?";
      case "payment-schedule": return "¿Qué días específicos te pagan?";
      case "stability": return "¿Cómo es tu ingreso mes a mes?";
      case "variable-type": return "¿Cómo funciona tu variación?";
      case "amount":
        if (stabilityPattern === "consistent") {
          return paymentStructure?.description ? `Configura tu ${paymentStructure.description.toLowerCase()}` : "¿Cuánto recibes por pago?";
        } else if (variableType === "range") {
          return "Cuéntanos sobre tu rango de ingresos";
        } else if (variableType === "cycles") {
          return "Configura tus pagos variables";
        }
        return "Configura tu ingreso";
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

      case "payment-structure":
        return (
          <View className="flex-1">
            <PaymentStructureSelector
              selectedStructure={paymentStructure}
              onStructureChange={handlePaymentStructureChange}
            />

            {errors.paymentStructure && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.paymentStructure}
              </Text>
            )}
          </View>
        );

      case "payment-schedule":
        return (
          <View className="flex-1">
            {paymentStructure && (
              <PaymentDateScheduler
                paymentStructure={paymentStructure}
                selectedSchedule={paymentSchedule}
                onScheduleChange={handlePaymentScheduleChange}
              />
            )}

            {errors.paymentSchedule && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.paymentSchedule}
              </Text>
            )}
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

      case "variable-type":
        return (
          <View className="flex-1">
            <VariableIncomeTypeSelector
              selectedType={variableType}
              onTypeChange={handleVariableTypeChange}
              stabilityPattern={stabilityPattern as "seasonal" | "variable"}
              frequency={frequency}
            />

            {errors.variableType && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.variableType}
              </Text>
            )}
          </View>
        );

      case "amount":
        return (
          <View className="flex-1">
            {stabilityPattern === "consistent" && paymentStructure ? (
              <PaymentAmountConfigurator
                paymentStructure={paymentStructure}
                amounts={paymentAmounts}
                onAmountsChange={setPaymentAmounts}
                stabilityPattern={stabilityPattern}
                errors={errors}
              />
            ) : stabilityPattern === "consistent" ? (
              // Legacy fallback
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
            ) : variableType === "range" ? (
              <IncomeRangeCollector
                stabilityPattern={stabilityPattern as "seasonal" | "variable"}
                frequency={paymentStructure?.type || frequency}
                incomeRange={incomeRange}
                onRangeChange={setIncomeRange}
                errors={errors}
              />
            ) : variableType === "cycles" && paymentStructure ? (
              <PaymentAmountConfigurator
                paymentStructure={paymentStructure}
                amounts={paymentAmounts}
                onAmountsChange={setPaymentAmounts}
                stabilityPattern={stabilityPattern}
                variableType={variableType}
                errors={errors}
              />
            ) : variableType === "cycles" ? (
              // Legacy fallback for cycles
              <View>
                <View className="p-4 bg-amber-50 rounded-xl mb-4">
                  <Text className="text-amber-800 text-sm">
                    💡 <Text className="font-medium">Monto de referencia:</Text> Ingresa un monto aproximado para inicializar tus ciclos de pago. Podrás ajustar cada pago específico en el siguiente paso.
                  </Text>
                </View>

                <InputField
                  label="Monto de referencia"
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
              </View>
            ) : null}
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