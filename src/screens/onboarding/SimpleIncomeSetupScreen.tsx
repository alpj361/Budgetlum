import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import InputField from "../../components/onboarding/InputField";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CENTRAL_AMERICA_COUNTRIES, getCurrencySymbol, getCountryBonuses, getPayFrequencies } from "../../types/centralAmerica";

type SimpleIncomeSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "SimpleIncomeSetup">;

interface SimpleIncomeData {
  monthlyAmount: string;
  payFrequency: string;
  payDate: number;
  takesHomePay: boolean;
  country: string;
}

export default function SimpleIncomeSetupScreen() {
  const navigation = useNavigation<SimpleIncomeSetupNavigationProp>();
  const { updateProfile, addIncome, setOnboardingStep, profile } = useUserStore();

  const [currentStep, setCurrentStep] = useState<"amount" | "frequency" | "date">("amount");
  const [incomeData, setIncomeData] = useState<SimpleIncomeData>({
    monthlyAmount: "",
    payFrequency: "",
    payDate: 1,
    takesHomePay: true,
    country: profile?.country || "GT"
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Get country-specific data
  const countryConfig = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === incomeData.country);
  const currencySymbol = getCurrencySymbol(incomeData.country);
  const countryBonuses = getCountryBonuses(incomeData.country);
  const payFrequencies = getPayFrequencies(incomeData.country);

  const validateCurrentStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (currentStep) {
      case "amount":
        if (!incomeData.monthlyAmount.trim()) {
          newErrors.monthlyAmount = "El monto es obligatorio";
        } else {
          const amount = parseFloat(incomeData.monthlyAmount);
          if (isNaN(amount) || amount <= 0) {
            newErrors.monthlyAmount = "Ingresa un monto válido";
          }
        }
        break;

      case "frequency":
        if (!incomeData.payFrequency) {
          newErrors.payFrequency = "Selecciona la frecuencia de pago";
        }
        break;

      case "date":
        if (incomeData.payDate < 1 || incomeData.payDate > 31) {
          newErrors.payDate = "Selecciona una fecha válida";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getNextStep = (): "amount" | "frequency" | "date" | null => {
    switch (currentStep) {
      case "amount": return "frequency";
      case "frequency": return "date";
      case "date": return null;
      default: return null;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    const nextStep = getNextStep();

    if (nextStep) {
      setCurrentStep(nextStep);
      setErrors({});
    } else {
      submitIncomeData();
    }
  };

  const submitIncomeData = () => {
    // Calculate annual bonuses
    const monthlyAmount = parseFloat(incomeData.monthlyAmount);
    const annualBonuses = countryBonuses.reduce((total, bonus) => {
      if (bonus.calculation === "monthly_salary") {
        return total + (monthlyAmount * bonus.months.length);
      }
      return total;
    }, 0);

    // Create income source
    const incomeSource = {
      id: "primary-income",
      name: "Ingreso principal",
      type: "salary" as const,
      amount: monthlyAmount,
      frequency: incomeData.payFrequency as any,
      isActive: true,
      isPrimary: true,
      country: incomeData.country,
      payDate: incomeData.payDate,
      takesHomePay: incomeData.takesHomePay,
      bonuses: countryBonuses.map(bonus => ({
        ...bonus,
        amount: bonus.calculation === "monthly_salary" ? monthlyAmount : bonus.amount || 0
      })),
      annualBonusTotal: annualBonuses
    };

    // Add income to store
    addIncome(incomeSource);

    // Update profile
    updateProfile({
      primaryIncome: monthlyAmount,
      payFrequency: incomeData.payFrequency as any,
      country: incomeData.country,
      hasSetupIncome: true
    });

    // Navigate to next step
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const handleBack = () => {
    const previousSteps = {
      "frequency": "amount",
      "date": "frequency"
    };

    const prevStep = previousSteps[currentStep as keyof typeof previousSteps];

    if (prevStep) {
      setCurrentStep(prevStep as "amount" | "frequency" | "date");
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    setOnboardingStep(3);
    navigation.navigate("ExpenseProfile");
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case "amount": return "¿Cuál es tu ingreso mensual?";
      case "frequency": return "¿Con qué frecuencia te pagan?";
      case "date": return "¿Cuándo recibes tu pago?";
      default: return "Configuremos tu ingreso";
    }
  };

  const getStepSubtitle = (): string => {
    switch (currentStep) {
      case "amount": return "Ingresa el monto que recibes después de impuestos";
      case "frequency": return "Selecciona qué tan seguido recibes tu salario";
      case "date": return "Esto nos ayuda a planificar mejor tu presupuesto";
      default: return "";
    }
  };

  const getNextButtonText = (): string => {
    return currentStep === "date" ? "Configurar bonos y finalizar" : "Continuar";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "amount":
        return (
          <View className="flex-1">
            <View className="mb-6">
              <InputField
                label={`Ingreso mensual (${currencySymbol})`}
                placeholder="0"
                value={incomeData.monthlyAmount}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9.]/g, '');
                  setIncomeData({ ...incomeData, monthlyAmount: numericText });
                  if (errors.monthlyAmount) {
                    setErrors({ ...errors, monthlyAmount: "" });
                  }
                }}
                keyboardType="decimal-pad"
                icon="cash"
                error={errors.monthlyAmount}
                required
              />
            </View>

            <View className="p-4 bg-blue-50 rounded-xl mb-6">
              <Text className="text-blue-800 text-sm">
                💡 <Text className="font-medium">Ingresa tu salario neto:</Text> El monto que realmente recibes después de impuestos y deducciones.
              </Text>
            </View>

            {/* Country-specific bonus preview */}
            {countryBonuses.length > 0 && (
              <View className="p-4 bg-green-50 rounded-xl">
                <Text className="text-green-800 font-medium mb-2">
                  🎁 Bonos incluidos en {countryConfig?.name}:
                </Text>
                {countryBonuses.map(bonus => (
                  <Text key={bonus.id} className="text-green-700 text-sm">
                    • {bonus.name} - {bonus.description}
                  </Text>
                ))}
                <Text className="text-green-700 text-xs mt-2">
                  Los configuraremos automáticamente según las leyes laborales.
                </Text>
              </View>
            )}
          </View>
        );

      case "frequency":
        return (
          <View className="flex-1">
            <View className="space-y-3">
              {payFrequencies.map((frequency) => (
                <SelectionCard
                  key={frequency.id}
                  id={frequency.id}
                  title={frequency.name}
                  description={frequency.description}
                  icon={frequency.id === "monthly" ? "calendar-outline" : frequency.id === "bi-weekly" ? "calendar" : "time"}
                  selected={incomeData.payFrequency === frequency.id}
                  onSelect={() => {
                    setIncomeData({ ...incomeData, payFrequency: frequency.id });
                    if (errors.payFrequency) {
                      setErrors({ ...errors, payFrequency: "" });
                    }
                  }}
                  badge={frequency.id === "monthly" ? "Más común" : undefined}
                />
              ))}
            </View>

            {errors.payFrequency && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.payFrequency}
              </Text>
            )}
          </View>
        );

      case "date":
        return (
          <View className="flex-1">
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                {incomeData.payFrequency === "monthly" ?
                  "¿Qué día del mes te pagan?" :
                  "¿Qué días del mes te pagan?"
                }
              </Text>

              {incomeData.payFrequency === "monthly" ? (
                <View className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectionCard
                      key={day}
                      id={day.toString()}
                      title={day.toString()}
                      selected={incomeData.payDate === day}
                      onSelect={() => {
                        setIncomeData({ ...incomeData, payDate: day });
                        if (errors.payDate) {
                          setErrors({ ...errors, payDate: "" });
                        }
                      }}
                      compact
                    />
                  ))}
                </View>
              ) : (
                <View className="space-y-3">
                  <SelectionCard
                    id="15-30"
                    title="15 y 30/31"
                    description="Días 15 y último día del mes"
                    icon="calendar"
                    selected={incomeData.payDate === 15}
                    onSelect={() => setIncomeData({ ...incomeData, payDate: 15 })}
                    badge="Más común"
                  />
                  <SelectionCard
                    id="1-15"
                    title="1 y 15"
                    description="Días 1 y 15 del mes"
                    icon="calendar"
                    selected={incomeData.payDate === 1}
                    onSelect={() => setIncomeData({ ...incomeData, payDate: 1 })}
                  />
                  <SelectionCard
                    id="varies"
                    title="Varía"
                    description="Las fechas cambian"
                    icon="shuffle"
                    selected={incomeData.payDate === 0}
                    onSelect={() => setIncomeData({ ...incomeData, payDate: 0 })}
                  />
                </View>
              )}
            </View>

            {errors.payDate && (
              <Text className="text-red-500 text-sm mt-2 ml-1">
                {errors.payDate}
              </Text>
            )}

            <View className="mt-6 p-4 bg-amber-50 rounded-xl">
              <Text className="text-amber-800 text-sm">
                💡 <Text className="font-medium">¿Las fechas varían?</Text> No te preocupes, puedes cambiar esto después o usar el modo avanzado para configuraciones más complejas.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Calculate estimated monthly with bonuses
  const getEstimatedMonthlyWithBonuses = (): number => {
    if (!incomeData.monthlyAmount) return 0;

    const monthlyAmount = parseFloat(incomeData.monthlyAmount);
    const annualBonuses = countryBonuses.reduce((total, bonus) => {
      if (bonus.calculation === "monthly_salary") {
        return total + (monthlyAmount * bonus.months.length);
      }
      return total;
    }, 0);

    return monthlyAmount + (annualBonuses / 12);
  };

  const estimatedWithBonuses = getEstimatedMonthlyWithBonuses();

  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case "amount":
        const amount = parseFloat(incomeData.monthlyAmount);
        return !!incomeData.monthlyAmount.trim() && !isNaN(amount) && amount > 0;
      case "frequency":
        return !!incomeData.payFrequency;
      case "date":
        return incomeData.payDate >= 0 && incomeData.payDate <= 31;
      default:
        return false;
    }
  }, [currentStep, incomeData]);

  return (
    <OnboardingContainer
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      currentStep={2}
      totalSteps={6}
      onNext={handleNext}
      onBack={currentStep !== "amount" ? handleBack : undefined}
      nextButtonText={getNextButtonText()}
      nextDisabled={!canProceed}
      showSkip={true}
      onSkip={handleSkip}
    >
      <View className="flex-1">
        {renderStepContent()}

        {/* Income Preview */}
        {estimatedWithBonuses > 0 && currentStep !== "amount" && (
          <View className="mt-6 p-4 bg-green-50 rounded-xl">
            <Text className="text-green-800 font-medium mb-1">
              ✅ Ingreso mensual estimado:
            </Text>
            <Text className="text-green-700 text-sm">
              {currencySymbol}{parseFloat(incomeData.monthlyAmount).toLocaleString()} base
              {countryBonuses.length > 0 && (
                <>
                  <Text> + {currencySymbol}{(estimatedWithBonuses - parseFloat(incomeData.monthlyAmount)).toLocaleString()} bonos/mes</Text>
                  <Text className="font-medium"> = {currencySymbol}{estimatedWithBonuses.toLocaleString()} total</Text>
                </>
              )}
            </Text>
          </View>
        )}
      </View>
    </OnboardingContainer>
  );
}