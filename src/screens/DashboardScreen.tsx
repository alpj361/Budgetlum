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
        <View className="px-6 pt-4 pb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Good morning! 👋
          </Text>
          <Text className="text-gray-600">
            Here is your spending overview
          </Text>
        </View>

        {/* Balance Card */}
        <View className="mx-6 mb-6">
          <BalanceCard totalSpent={totalSpent} totalBudget={totalBudget} />
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </Text>
            <View className="flex-row space-x-4">
            <AnimatedPressable 
              className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              onPress={() => navigation.navigate("Add")}
            >
              <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="add" size={20} color="#10b981" />
              </View>
              <Text className="font-medium text-gray-900">Add Expense</Text>
              <Text className="text-gray-500 text-sm">Manual entry</Text>
            </AnimatedPressable>
            
            <AnimatedPressable 
              className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              onPress={() => navigation.navigate("StatementUpload")}
            >
              <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="document-text" size={20} color="#3b82f6" />
              </View>
              <Text className="font-medium text-gray-900">Upload Statement</Text>
              <Text className="text-gray-500 text-sm">Auto-detect</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Top Categories */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Top Categories
            </Text>
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {categoryInsights.map((insight, index) => (
                <View key={insight.category} className={`flex-row items-center justify-between ${index < categoryInsights.length - 1 ? "mb-4" : ""}`}>
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: insight.color }}
                    />
                    <Text className="font-medium text-gray-900 flex-1">
                      {insight.category}
                    </Text>
                  </View>
                  <View className="items-end">
                     <Text className="font-semibold text-gray-900">
                       {formatCurrency(insight.totalSpent, currency)}
                     </Text>
                    <Text className="text-gray-500 text-sm">
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
          <View className="px-6 mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Recent Expenses
              </Text>
               <AnimatedPressable onPress={() => navigation.navigate("Add")}>
                <Text className="text-blue-600 font-medium">Add</Text>
              </AnimatedPressable>
            </View>
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {recentExpenses.map((expense, index) => (
                <Swipeable
                  key={expense.id}
                  overshootRight={false}
                  rightThreshold={40}
                  renderRightActions={(progress, translation, methods) => (
                    <View className="h-full flex-row items-stretch">
                      <Pressable
                        onPress={() => {
                          setPendingDelete(expense.id);
                          methods?.close?.();
                        }}
                        className="bg-red-500 w-16 items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar"
                      >
                        <Ionicons name="trash" size={22} color="white" />
                      </Pressable>
                    </View>
                  )}
                >
                  <View className={`p-4 ${index < recentExpenses.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900 mb-1">
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
                        <Text className="font-semibold text-gray-900">
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
