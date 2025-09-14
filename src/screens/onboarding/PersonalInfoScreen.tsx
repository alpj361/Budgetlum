import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import InputField from "../../components/onboarding/InputField";
import SelectionCard from "../../components/onboarding/SelectionCard";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type PersonalInfoScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "PersonalInfo">;

const lifeStageOptions = [
  {
    id: "student",
    title: "Estudiante",
    description: "Enfocado en educación y gastos básicos",
    icon: "school" as const,
  },
  {
    id: "young_professional",
    title: "Profesional joven",
    description: "Empezando carrera profesional",
    icon: "briefcase" as const,
  },
  {
    id: "family",
    title: "Familia",
    description: "Con hijos o dependientes",
    icon: "home" as const,
  },
  {
    id: "established",
    title: "Establecido",
    description: "Carrera consolidada, enfoque en inversión",
    icon: "trending-up" as const,
  },
  {
    id: "retirement",
    title: "Pre-jubilación",
    description: "Planificando la jubilación",
    icon: "time" as const,
  },
];

export default function PersonalInfoScreen() {
  const navigation = useNavigation<PersonalInfoScreenNavigationProp>();
  const { updateProfile, setOnboardingStep } = useUserStore();

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [lifeStage, setLifeStage] = useState<string>("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    } else if (name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    }

    if (!lifeStage) {
      newErrors.lifeStage = "Por favor selecciona tu etapa de vida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    // Update user profile
    updateProfile({
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      lifeStage: lifeStage as any,
    });

    setOnboardingStep(2);
    navigation.navigate("IncomeSetup");
  };

  const handleBack = () => {
    setOnboardingStep(0);
    navigation.goBack();
  };

  const canProceed = name.trim().length >= 2 && lifeStage;

  return (
    <OnboardingContainer
      title="Cuéntanos sobre ti"
      subtitle="Esta información nos ayudará a personalizar tu experiencia financiera"
      currentStep={1}
      totalSteps={6}
      onNext={handleNext}
      onBack={handleBack}
      nextButtonText="Continuar"
      nextDisabled={!canProceed}
    >
      <View className="flex-1">
        {/* Basic Info Section */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Información básica
          </Text>

          <InputField
            label="¿Cómo te llamas?"
            placeholder="Ej: María González"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors({ ...errors, name: "" });
              }
            }}
            icon="person"
            error={errors.name}
            required
          />

          <InputField
            label="¿Cómo prefieres que te llamen?"
            placeholder="Ej: Mari (opcional)"
            value={nickname}
            onChangeText={setNickname}
            icon="heart"
            hint="Bussy usará este nombre en las conversaciones"
          />
        </View>

        {/* Life Stage Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Etapa de vida
          </Text>

          <Text className="text-gray-600 mb-4">
            Esto nos ayuda a darte consejos más relevantes
          </Text>

          {lifeStageOptions.map((option) => (
            <SelectionCard
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              isSelected={lifeStage === option.id}
              onPress={() => {
                setLifeStage(option.id);
                if (errors.lifeStage) {
                  setErrors({ ...errors, lifeStage: "" });
                }
              }}
            />
          ))}

          {errors.lifeStage && (
            <Text className="text-red-500 text-sm mt-2 ml-1">
              {errors.lifeStage}
            </Text>
          )}
        </View>

        {/* Progress indicator */}
        <View className="flex-1 justify-end">
          <View className="p-4 bg-blue-50 rounded-xl">
            <Text className="text-blue-800 font-medium text-center">
              💡 Bussy usará esta información para darte consejos personalizados
            </Text>
          </View>
        </View>
      </View>
    </OnboardingContainer>
  );
}