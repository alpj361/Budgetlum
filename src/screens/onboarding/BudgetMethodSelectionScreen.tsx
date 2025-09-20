import React from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type BudgetMethodSelectionNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "BudgetMethodSelection">;

export default function BudgetMethodSelectionScreen() {
  const navigation = useNavigation<BudgetMethodSelectionNavigationProp>();
  const { setOnboardingStep, updateProfile } = useUserStore();

  const handleUIMode = () => {
    updateProfile({ budgetSetupMethod: "ui" });
    setOnboardingStep(4);
    navigation.navigate("UIBudgetSetup");
  };

  const handleAIMode = () => {
    updateProfile({ budgetSetupMethod: "ai" });
    setOnboardingStep(4);
    navigation.navigate("AIAdvancedSetup");
  };

  const handleSkip = () => {
    updateProfile({ budgetSetupMethod: "skip" });
    setOnboardingStep(5);
    navigation.navigate("Goals");
  };

  const handleBack = () => {
    setOnboardingStep(2);
    navigation.goBack();
  };

  return (
    <OnboardingContainer
      title="¿Cómo quieres configurar tu presupuesto?"
      subtitle="Elige el método que prefieras para crear tu presupuesto personalizado"
      currentStep={3}
      totalSteps={6}
      onBack={handleBack}
      showProgress={true}
    >
      <View className="flex-1 space-y-4">
        {/* UI Mode Card */}
        <SelectionCard
          title="Configuración Visual"
          description="Usa una interfaz simple con categorías predefinidas para configurar tu presupuesto"
          icon="grid-outline"
          isSelected={false}
          onPress={handleUIMode}
          badge="Rápido y fácil"
          badgeColor="green"
        />

        {/* AI Mode Card */}
        <SelectionCard
          title="Asistido por Bussy AI"
          description="Deja que Bussy te guíe con preguntas inteligentes para crear un presupuesto personalizado"
          icon="chatbubble-ellipses"
          isSelected={false}
          onPress={handleAIMode}
          badge="Personalizado"
          badgeColor="blue"
        />

        {/* Skip Option */}
        <SelectionCard
          title="Configurar después"
          description="Continúa con la configuración y configura tu presupuesto más tarde"
          icon="time-outline"
          isSelected={false}
          onPress={handleSkip}
        />

        {/* Helper Text */}
        <View className="mt-6 p-4 bg-blue-50 rounded-xl">
          <Text className="text-blue-800 text-sm text-center">
            💡 <Text className="font-medium">¿No estás seguro?</Text> Puedes cambiar tu presupuesto en cualquier momento desde la aplicación
          </Text>
        </View>

        {/* Method Explanations */}
        <View className="mt-8 space-y-4">
          <View>
            <Text className="text-gray-700 font-medium mb-2">Configuración Visual es ideal para:</Text>
            <Text className="text-gray-600 text-sm leading-5">
              • Usuarios que prefieren controles visuales{"\n"}
              • Configuración rápida con categorías estándar{"\n"}
              • Quienes tienen experiencia con presupuestos
            </Text>
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-2">Bussy AI es ideal para:</Text>
            <Text className="text-gray-600 text-sm leading-5">
              • Usuarios nuevos en presupuestos{"\n"}
              • Quienes quieren recomendaciones personalizadas{"\n"}
              • Situaciones financieras complejas{"\n"}
              • Consejos basados en tu perfil específico
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}