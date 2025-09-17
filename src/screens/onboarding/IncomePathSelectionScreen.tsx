import React from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type IncomePathSelectionNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "IncomePathSelection">;

export default function IncomePathSelectionScreen() {
  const navigation = useNavigation<IncomePathSelectionNavigationProp>();
  const { setOnboardingStep } = useUserStore();

  const handleSimplePath = () => {
    setOnboardingStep(2);
    navigation.navigate("SimpleIncomeSetup");
  };

  const handleAdvancedPath = () => {
    setOnboardingStep(2);
    navigation.navigate("AdvancedIncomeSetup");
  };

  const handleBack = () => {
    setOnboardingStep(1);
    navigation.goBack();
  };

  return (
    <OnboardingContainer
      title="¿Cómo configuramos tu ingreso?"
      subtitle="Elige la opción que mejor describa tu situación"
      currentStep={2}
      totalSteps={6}
      onBack={handleBack}
      showProgress={true}
    >
      <View className="flex-1 space-y-4">
        {/* Simple Path Card */}
        <SelectionCard
          id="simple"
          title="Simple"
          description="Tengo ingresos regulares, solo quiero presupuestar fácil"
          icon="card-outline"
          onSelect={handleSimplePath}
          badge="La mayoría elige esta opción"
          badgeColor="green"
        />

        {/* Advanced Path Card */}
        <SelectionCard
          id="advanced"
          title="Avanzado"
          description="Tengo ingresos variables o múltiples fuentes de ingreso"
          icon="trending-up"
          onSelect={handleAdvancedPath}
          badge="Guiado por Bussy AI"
          badgeColor="blue"
        />

        {/* Helper Text */}
        <View className="mt-6 p-4 bg-blue-50 rounded-xl">
          <Text className="text-blue-800 text-sm text-center">
            💡 <Text className="font-medium">¿No estás seguro?</Text> Puedes cambiar entre opciones en cualquier momento
          </Text>
        </View>

        {/* Examples */}
        <View className="mt-8 space-y-4">
          <View>
            <Text className="text-gray-700 font-medium mb-2">Simple es ideal para:</Text>
            <Text className="text-gray-600 text-sm leading-5">
              • Salario fijo mensual{"\n"}
              • Trabajo de medio tiempo{"\n"}
              • Ingresos consistentes cada mes
            </Text>
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-2">Avanzado es ideal para:</Text>
            <Text className="text-gray-600 text-sm leading-5">
              • Freelancers y consultores{"\n"}
              • Múltiples trabajos{"\n"}
              • Ingresos por temporadas{"\n"}
              • Negocios propios
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}