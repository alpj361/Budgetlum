import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import AnimatedPressable from "../../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../../state/userStore";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCurrencySymbol } from "../../types/centralAmerica";
import { DataCollectionService, BudgetSuggestion } from "../../services/dataCollectionService";

type UIBudgetSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "UIBudgetSetup">;

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  suggestedAmount: number;
  currentAmount: number;
  percentage: number;
  priority: "essential" | "important" | "optional";
  reasoning: string;
}

export default function UIBudgetSetupScreen() {
  const navigation = useNavigation<UIBudgetSetupNavigationProp>();
  const { profile, incomes, setOnboardingStep, updateProfile, createBudget } = useUserStore();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBudget, setTotalBudget] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);

  const currencySymbol = getCurrencySymbol(profile?.country || "GT");
  const monthlyIncome = profile?.primaryIncome || 0;

  useEffect(() => {
    loadBudgetSuggestions();
  }, []);

  useEffect(() => {
    const total = categories.reduce((sum, cat) => sum + cat.currentAmount, 0);
    setTotalBudget(total);
    setRemainingBudget(monthlyIncome - total);
  }, [categories, monthlyIncome]);

  const loadBudgetSuggestions = async () => {
    try {
      setIsLoading(true);

      // Compile user data for AI analysis
      const userData = DataCollectionService.compileUserData(
        incomes.map(income => ({
          name: income.name,
          type: income.type,
          amount: income.amount,
          minAmount: income.minAmount,
          maxAmount: income.maxAmount,
          frequency: income.frequency,
          isVariable: income.isVariable,
          confidence: 1.0
        })),
        [], // No conversation history for Simple mode
        profile?.country || "GT",
        "simple"
      );

      // Get AI-generated budget suggestions
      const suggestions = await DataCollectionService.generateBudgetSuggestions(userData);

      // Convert suggestions to categories with icons
      const budgetCategories: BudgetCategory[] = suggestions.map((suggestion, index) => ({
        id: `category-${index}`,
        name: suggestion.category,
        icon: getCategoryIcon(suggestion.category),
        suggestedAmount: suggestion.suggestedAmount,
        currentAmount: suggestion.suggestedAmount,
        percentage: suggestion.percentage,
        priority: suggestion.priority,
        reasoning: suggestion.reasoning
      }));

      setCategories(budgetCategories);
    } catch (error) {
      console.error("Error loading budget suggestions:", error);
      // Fallback to default categories
      setCategories(getDefaultCategories());
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (categoryName: string): string => {
    const iconMap: Record<string, string> = {
      "Alimentación": "restaurant-outline",
      "Vivienda": "home-outline",
      "Transporte": "car-outline",
      "Servicios básicos": "flash-outline",
      "Ahorro de emergencia": "shield-checkmark-outline",
      "Entretenimiento": "game-controller-outline",
      "Salud": "medical-outline",
      "Educación": "school-outline",
      "Remesas familiares": "people-outline",
      "Festividades": "gift-outline",
      "Familia": "heart-outline",
      "Celebraciones": "balloon-outline"
    };
    return iconMap[categoryName] || "ellipse-outline";
  };

  const getDefaultCategories = (): BudgetCategory[] => {
    const income = monthlyIncome;
    return [
      {
        id: "food",
        name: "Alimentación",
        icon: "restaurant-outline",
        suggestedAmount: Math.round(income * 0.25),
        currentAmount: Math.round(income * 0.25),
        percentage: 25,
        priority: "essential",
        reasoning: "Porcentaje estándar para alimentación"
      },
      {
        id: "housing",
        name: "Vivienda",
        icon: "home-outline",
        suggestedAmount: Math.round(income * 0.30),
        currentAmount: Math.round(income * 0.30),
        percentage: 30,
        priority: "essential",
        reasoning: "Renta o gastos de vivienda"
      },
      {
        id: "transport",
        name: "Transporte",
        icon: "car-outline",
        suggestedAmount: Math.round(income * 0.15),
        currentAmount: Math.round(income * 0.15),
        percentage: 15,
        priority: "important",
        reasoning: "Movilidad diaria"
      },
      {
        id: "emergency",
        name: "Ahorro de emergencia",
        icon: "shield-checkmark-outline",
        suggestedAmount: Math.round(income * 0.10),
        currentAmount: Math.round(income * 0.10),
        percentage: 10,
        priority: "important",
        reasoning: "Fondo de emergencia"
      },
      {
        id: "entertainment",
        name: "Entretenimiento",
        icon: "game-controller-outline",
        suggestedAmount: Math.round(income * 0.10),
        currentAmount: Math.round(income * 0.10),
        percentage: 10,
        priority: "optional",
        reasoning: "Gastos de ocio"
      }
    ];
  };

  const updateCategoryAmount = (categoryId: string, newAmount: number) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, currentAmount: Math.max(0, newAmount) }
          : cat
      )
    );
  };

  const resetToSuggested = () => {
    setCategories(prev =>
      prev.map(cat => ({ ...cat, currentAmount: cat.suggestedAmount }))
    );
  };

  const handleSaveBudget = () => {
    // Create budget categories from UI data
    const budgetCategories = categories.map(cat => ({
      name: cat.name,
      limit: cat.currentAmount,
      spent: 0,
      priority: cat.priority,
      icon: cat.icon,
      reasoning: cat.reasoning,
      isActive: true,
      period: "monthly" as const
    }));

    // Create the budget
    const budget = {
      name: "Mi Presupuesto",
      categories: budgetCategories,
      totalLimit: totalBudget,
      totalSpent: 0,
      period: "monthly" as const,
      isActive: true
    };

    createBudget(budget);

    // Update profile
    updateProfile({
      hasSetupBudget: true,
      budgetSetupMethod: "ui"
    });

    setOnboardingStep(5);
    navigation.navigate("Goals");
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getPriorityColor = (priority: "essential" | "important" | "optional") => {
    switch (priority) {
      case "essential": return "text-red-600";
      case "important": return "text-orange-600";
      case "optional": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const getPriorityBadge = (priority: "essential" | "important" | "optional") => {
    switch (priority) {
      case "essential": return { text: "Esencial", color: "bg-red-100 text-red-800" };
      case "important": return { text: "Importante", color: "bg-orange-100 text-orange-800" };
      case "optional": return { text: "Opcional", color: "bg-blue-100 text-blue-800" };
      default: return { text: "Normal", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (isLoading) {
    return (
      <OnboardingContainer
        title="Configuración Visual"
        subtitle="Generando tu presupuesto personalizado..."
        currentStep={4}
        totalSteps={6}
        onBack={handleBack}
      >
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <Text className="text-gray-600 text-center">
            Analizando tus ingresos para crear el mejor presupuesto...
          </Text>
        </View>
      </OnboardingContainer>
    );
  }

  return (
    <OnboardingContainer
      title="Configuración Visual"
      subtitle="Ajusta las categorías según tus necesidades"
      currentStep={4}
      totalSteps={6}
      onBack={handleBack}
    >
      <View className="flex-1">
        {/* Budget Summary */}
        <View className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-blue-800 font-medium">Ingreso mensual</Text>
            <Text className="text-blue-900 font-bold text-lg">
              {currencySymbol}{monthlyIncome.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-blue-700">Presupuesto asignado</Text>
            <Text className="text-blue-800 font-medium">
              {currencySymbol}{totalBudget.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-blue-700">Restante</Text>
            <Text className={`font-medium ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencySymbol}{remainingBudget.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            {categories.map((category) => {
              const badge = getPriorityBadge(category.priority);

              return (
                <View key={category.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name={category.icon as any} size={20} color="#2563EB" />
                      </View>

                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium text-base">
                          {category.name}
                        </Text>
                        <View className={`px-2 py-1 rounded-full self-start mt-1 ${badge.color}`}>
                          <Text className="text-xs font-medium">{badge.text}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-600 text-sm">Sugerido: {currencySymbol}{category.suggestedAmount.toLocaleString()}</Text>
                    <Text className="text-gray-500 text-xs">({category.percentage}%)</Text>
                  </View>

                  <View className="flex-row items-center space-x-3">
                    <View className="flex-1 flex-row items-center bg-gray-50 rounded-xl px-3 py-2">
                      <Text className="text-gray-700 mr-2">{currencySymbol}</Text>
                      <TextInput
                        className="flex-1 text-gray-900 font-medium text-base"
                        value={category.currentAmount.toString()}
                        onChangeText={(text) => {
                          const amount = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                          updateCategoryAmount(category.id, amount);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>

                    <AnimatedPressable
                      onPress={() => updateCategoryAmount(category.id, category.suggestedAmount)}
                      className="px-3 py-2 bg-blue-100 rounded-lg"
                    >
                      <Text className="text-blue-600 text-sm font-medium">Usar sugerido</Text>
                    </AnimatedPressable>
                  </View>

                  <Text className="text-gray-500 text-xs mt-2 leading-4">
                    {category.reasoning}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="mt-6 space-y-3">
          <AnimatedPressable
            onPress={resetToSuggested}
            className="bg-gray-100 border border-gray-200 rounded-xl py-3 items-center"
          >
            <Text className="text-gray-700 font-medium">
              Restaurar sugerencias
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleSaveBudget}
            className="bg-blue-600 rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              Guardar presupuesto
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </OnboardingContainer>
  );
}