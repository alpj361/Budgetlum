import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExpenseStore } from "../state/expenseStore";
import { format } from "date-fns";
import BalanceCard from "../components/BalanceCard";
import { useNavigation } from "@react-navigation/native";
import AnimatedPressable from "../components/AnimatedPressable";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";
import ConfirmModal from "../components/ConfirmModal";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import * as Haptics from "expo-haptics";

export default function DashboardScreen() {
  const { expenses, getTotalSpent, getCategoryInsights, budgets, deleteExpense } = useExpenseStore();
  const navigation = useNavigation<any>();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const totalSpent = getTotalSpent();
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const recentExpenses = expenses.slice(0, 5);
  const categoryInsights = getCategoryInsights().slice(0, 3);
  
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-2 pb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Good morning! 👋
          </Text>
          <Text className="text-gray-600 text-base">
            Here is your spending overview
          </Text>
        </View>

        {/* Balance Card */}
        <View className="mx-6 mb-8">
          <BalanceCard totalSpent={totalSpent} totalBudget={totalBudget} />
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </Text>
            <View className="flex-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <AnimatedPressable 
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              style={{ width: "48%" }}
              onPress={() => navigation.navigate("Add")}
            >
              <View className="bg-green-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="add-outline" size={20} color="#10b981" />
              </View>
              <Text className="font-semibold text-gray-900 text-base">Add Expense</Text>
              <Text className="text-gray-500 text-sm mt-1">Manual entry</Text>
            </AnimatedPressable>
            
            <AnimatedPressable 
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              style={{ width: "48%" }}
              onPress={() => navigation.navigate("StatementUpload")}
            >
              <View className="bg-blue-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              </View>
              <Text className="font-semibold text-gray-900 text-base">Upload Statement</Text>
              <Text className="text-gray-500 text-sm mt-1">Auto-detect</Text>
            </AnimatedPressable>

            <AnimatedPressable 
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              style={{ width: "48%" }}
              onPress={() => navigation.navigate("NotesBulk")}
            >
              <View className="bg-purple-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="create-outline" size={20} color="#8b5cf6" />
              </View>
              <Text className="font-semibold text-gray-900 text-base">Add From Notes</Text>
              <Text className="text-gray-500 text-sm mt-1">Paste and review</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Top Categories */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Top Categories
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              {categoryInsights.map((insight, index) => (
                <View key={insight.category} className={`flex-row items-center justify-between ${index < categoryInsights.length - 1 ? "mb-5" : ""}`}>
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-3 h-3 rounded-full mr-4"
                      style={{ backgroundColor: insight.color }}
                    />
                    <Text className="font-medium text-gray-900 flex-1 text-base">
                      {insight.category}
                    </Text>
                  </View>
                  <View className="items-end">
                     <Text className="font-semibold text-gray-900 text-base">
                       {formatCurrency(insight.totalSpent, currency)}
                     </Text>
                    <Text className="text-gray-500 text-sm mt-0.5">
                      {insight.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <View className="px-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Recent Expenses
              </Text>
               <AnimatedPressable onPress={() => navigation.navigate("Add")}>
                <Text className="text-blue-600 font-medium text-base">Add</Text>
              </AnimatedPressable>
            </View>
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {recentExpenses.map((expense, index) => (
                <Swipeable
                  key={expense.id}
                  overshootRight={false}
                  rightThreshold={40}
                  renderRightActions={(_, __, methods) => (
                    <View className="h-full flex-row items-stretch">
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setPendingDelete(expense.id);
                          methods?.close?.();
                        }}
                        className="bg-red-500 w-20 items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar"
                      >
                        <Ionicons name="trash-outline" size={20} color="white" />
                      </Pressable>
                    </View>
                  )}
                >
                  <View className={`p-5 ${index < recentExpenses.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900 mb-2 text-base">
                          {expense.description}
                        </Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 text-sm">
                            {expense.category}
                          </Text>
                          <Text className="text-gray-400 text-sm mx-2">•</Text>
                          <Text className="text-gray-500 text-sm">
                            {format(new Date(expense.date), "MMM d")}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="font-semibold text-gray-900 text-base">
                          -{formatCurrency(expense.amount, currency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Swipeable>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {expenses.length === 0 && (
          <View className="px-6 py-12 items-center">
            <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
              <Ionicons name="receipt-outline" size={32} color="#6b7280" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No expenses yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Start tracking your expenses by adding your first transaction
            </Text>
            <AnimatedPressable className="bg-blue-600 rounded-xl px-6 py-3" onPress={() => navigation.navigate("Add")}>
              <Text className="text-white font-semibold">Add First Expense</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!pendingDelete}
        title="Eliminar gasto"
        message="Esta acción no se puede deshacer"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteExpense(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </SafeAreaView>
  );
}
