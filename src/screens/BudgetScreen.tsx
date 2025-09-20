import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  TouchableOpacity,
} from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExpenseStore } from "../state/expenseStore";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "../types/expense";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency, getCurrencySymbol } from "../utils/currency";
import { useConversationStore } from "../state/conversationStore";
import { useUserStore } from "../state/userStore";
import { useNavigation } from "@react-navigation/native";

export default function BudgetScreen() {
  const { budgets, setBudget } = useExpenseStore();
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const { setMode, advancedModeState } = useConversationStore();
  const { getTotalIncome } = useUserStore();
  const navigation = useNavigation();

  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetPeriod, setNewBudgetPeriod] = useState<"monthly" | "weekly" | "yearly">("monthly");

  const handleAddBudget = () => {
    if (!newBudgetAmount) {
      Alert.alert("Error", "Please enter a budget amount");
      return;
    }

    const amount = parseFloat(newBudgetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setBudget(newBudgetCategory, amount, newBudgetPeriod);
    
    // Reset form
    setNewBudgetAmount("");
    setNewBudgetCategory(EXPENSE_CATEGORIES[0]);
    setNewBudgetPeriod("monthly");
    setShowAddBudget(false);
    
    Alert.alert("Success", "Budget set successfully!");
  };

  const getBudgetStatus = (budget: any) => {
    const percentage = (budget.spent / budget.limit) * 100;
    if (percentage >= 100) return { status: "over", color: "#ef4444" };
    if (percentage >= 80) return { status: "warning", color: "#f59e0b" };
    return { status: "good", color: "#10b981" };
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const startAIBudgetSetup = () => {
    setMode('advanced');
    navigation.navigate('AI Chat' as never);
  };

  const hasAIGeneratedBudgets = () => {
    // Check if we have standard AI-generated categories
    const aiCategories = ['Vivienda', 'Alimentación', 'Transporte', 'Entretenimiento', 'Ahorros'];
    return aiCategories.some(category => budgets.find(b => b.category === category));
  };

  const monthlyIncome = getTotalIncome('monthly');
  const budgetCoverage = monthlyIncome > 0 ? (totalBudget / monthlyIncome) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Gestión de presupuestos
          </Text>
          <Text className="text-gray-600">
            Define y controla tus límites de gasto
          </Text>
        </View>

        {/* AI Insights Panel */}
        {budgets.length === 0 ? (
          <View className="px-6 mb-6">
            <View className="bg-gradient-to-r from-blue-500 to-green-500 rounded-xl p-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="construct" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Configuración Inteligente
                </Text>
              </View>
              <Text className="text-white mb-4">
                Deja que la IA configure tu presupuesto automáticamente basado en tus ingresos y mejores prácticas financieras.
              </Text>
              <TouchableOpacity
                onPress={startAIBudgetSetup}
                className="bg-white rounded-lg py-3 px-4"
              >
                <Text className="text-blue-600 font-semibold text-center">
                  Configurar con IA
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : hasAIGeneratedBudgets() ? (
          <View className="px-6 mb-6">
            <View className="bg-green-50 border border-green-200 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text className="text-green-800 font-semibold ml-2">
                    Presupuesto generado por IA
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={startAIBudgetSetup}
                  className="px-3 py-1 bg-green-100 rounded-full"
                >
                  <Text className="text-green-700 text-sm font-medium">
                    Optimizar
                  </Text>
                </TouchableOpacity>
              </View>
              {monthlyIncome > 0 && (
                <Text className="text-green-700 text-sm mt-2">
                  Cobertura: {budgetCoverage.toFixed(0)}% de tus ingresos
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Overall Budget Summary */}
        {budgets.length > 0 && (
          <View className="px-6 mb-6">
            <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-start mb-4">
                <View>
                  <Text className="text-gray-600 text-sm font-medium">
                    Presupuesto total
                  </Text>
                  <Text className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalBudget, currency)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-600 text-sm font-medium">
                    Gastado
                  </Text>
                  <Text className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalSpent, currency)}
                  </Text>
                </View>
              </View>
              
              <View className="mb-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-gray-600 text-sm">
                    Progreso general
                  </Text>
                  <Text className="text-gray-900 text-sm font-medium">
                    {overallPercentage.toFixed(0)}%
                  </Text>
                </View>
                <View className="bg-gray-200 rounded-full h-3">
                  <View 
                    className="rounded-full h-3"
                    style={{ 
                      width: `${Math.min(overallPercentage, 100)}%`,
                      backgroundColor: overallPercentage >= 100 ? "#ef4444" : overallPercentage >= 80 ? "#f59e0b" : "#10b981"
                    }}
                  />
                </View>
              </View>
              
               <Text className="text-gray-500 text-sm text-center">
                {formatCurrency(totalBudget - totalSpent, currency)} restante
              </Text>
            </View>
          </View>
        )}

        {/* Add Budget Button */}
        <View className="px-6 mb-6">
          <AnimatedPressable
            onPress={() => setShowAddBudget(!showAddBudget)}
            className="bg-blue-600 rounded-xl py-4 items-center shadow-sm"
          >
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Agregar presupuesto
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Add Budget Form */}
        {showAddBudget && (
          <View className="px-6 mb-6">
            <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Crear nuevo presupuesto
              </Text>
              
              {/* Category Selection */}
              <View className="mb-4">
                 <Text className="text-gray-700 font-medium mb-2">Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-3">
                    {EXPENSE_CATEGORIES.map((category) => (
                      <Pressable
                        key={category}
                        onPress={() => setNewBudgetCategory(category)}
                        className={`px-4 py-2 rounded-full border ${
                          newBudgetCategory === category
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`font-medium ${
                            newBudgetCategory === category
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Amount */}
              <View className="mb-4">
                 <Text className="text-gray-700 font-medium mb-2">Monto del presupuesto</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                  <Text className="text-gray-600 text-lg font-medium mr-2">$</Text>
                  <TextInput
                    value={newBudgetAmount}
                    onChangeText={setNewBudgetAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className="flex-1 text-lg font-medium text-gray-900"
                  />
                </View>
              </View>

              {/* Period */}
              <View className="mb-6">
                 <Text className="text-gray-700 font-medium mb-2">Periodo</Text>
                <View className="flex-row space-x-3">
                  {(["weekly", "monthly", "yearly"] as const).map((period) => (
                    <AnimatedPressable
                      key={period}
                      onPress={() => setNewBudgetPeriod(period)}
                      className={`flex-1 py-3 rounded-xl border ${
                        newBudgetPeriod === period
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                       <Text
                        className={`text-center font-medium capitalize ${
                          newBudgetPeriod === period
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {period === "weekly" ? "semanal" : period === "monthly" ? "mensual" : "anual"}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row space-x-3">
                <AnimatedPressable
                  onPress={() => setShowAddBudget(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200"
                >
                    <Text className="text-center font-medium text-gray-700">
                    Cancelar
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleAddBudget}
                  className="flex-1 py-3 rounded-xl bg-blue-600"
                >
                   <Text className="text-center font-medium text-white">
                    Guardar
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        )}

        {/* Budget List */}
        {budgets.length > 0 && (
          <View className="px-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
              Tus presupuestos
            </Text>
            <View className="space-y-4">
              {budgets.map((budget, index) => {
                const budgetStatus = getBudgetStatus(budget);
                const percentage = (budget.spent / budget.limit) * 100;
                
                return (
                  <View key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <View className="flex-row justify-between items-start mb-3">
                      <View>
                        <Text className="font-semibold text-gray-900 text-lg">
                          {budget.category}
                        </Text>
                        <Text className="text-gray-500 text-sm capitalize">
                          {budget.period}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-gray-900">
                          {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.limit, currency)}
                        </Text>
                        <Text 
                          className="text-sm font-medium"
                          style={{ color: budgetStatus.color }}
                        >
                          {percentage.toFixed(0)}% usado
                        </Text>
                      </View>
                    </View>
                    
                    <View className="mb-2">
                      <View className="bg-gray-200 rounded-full h-3">
                        <View 
                          className="rounded-full h-3"
                          style={{ 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: budgetStatus.color
                          }}
                        />
                      </View>
                    </View>
                    
                    <Text className="text-gray-500 text-sm text-center">
                      {formatCurrency(budget.limit - budget.spent, currency)} restante
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {budgets.length === 0 && (
          <View className="px-6 py-12 items-center">
            <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
              <Ionicons name="wallet-outline" size={32} color="#6b7280" />
            </View>
             <Text className="text-lg font-semibold text-gray-900 mb-2">
              Aún no hay presupuestos
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Crea tu primer presupuesto para empezar a controlar tus límites de gasto
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}