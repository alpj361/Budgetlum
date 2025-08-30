import React from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExpenseStore } from "../state/expenseStore";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";

const { width } = Dimensions.get("window");

export default function InsightsScreen() {
  const { expenses, getTotalSpent, getCategoryInsights } = useExpenseStore();
  const currency = useSettingsStore((s) => s.primaryCurrency);
  
  const totalSpent = getTotalSpent();
  const categoryInsights = getCategoryInsights();
  
  // Calculate daily spending for the current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const dailySpending = daysInMonth.map(day => {
    const daySpending = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.toDateString() === day.toDateString();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      date: day,
      amount: daySpending,
    };
  });

  const maxDailySpending = Math.max(...dailySpending.map(d => d.amount), 1);
  const avgDailySpending = totalSpent / daysInMonth.length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Spending Insights
          </Text>
          <Text className="text-gray-600">
            Understand your spending patterns
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="px-6 mb-6">
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="trending-up" size={20} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalSpent, currency)}
              </Text>
              <Text className="text-gray-500 text-sm">Total Spent</Text>
            </View>
            
            <View className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="calendar" size={20} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(avgDailySpending, currency)}
              </Text>
              <Text className="text-gray-500 text-sm">Daily Average</Text>
            </View>
          </View>
        </View>

        {/* Spending by Category */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Spending by Category
            </Text>
            <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              {categoryInsights.map((insight, index) => (
                <View key={insight.category} className={`${index < categoryInsights.length - 1 ? "mb-4" : ""}`}>
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <View 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: insight.color }}
                      />
                      <Text className="font-medium text-gray-900">
                        {insight.category}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-gray-900">
                        {formatCurrency(insight.totalSpent, currency)}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {insight.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <View className="bg-gray-100 rounded-full h-2">
                    <View 
                      className="rounded-full h-2"
                      style={{ 
                        width: `${insight.percentage}%`,
                        backgroundColor: insight.color 
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Daily Spending Chart */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Daily Spending This Month
          </Text>
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row items-end space-x-2" style={{ width: Math.max(width - 80, dailySpending.length * 20) }}>
                {dailySpending.map((day, index) => {
                  const height = Math.max((day.amount / maxDailySpending) * 120, 4);
                  const isToday = day.date.toDateString() === now.toDateString();
                  
                  return (
                    <View key={index} className="items-center">
                      <View
                        className={`rounded-t ${day.amount > 0 ? "bg-blue-500" : "bg-gray-200"} ${isToday ? "bg-blue-600" : ""}`}
                        style={{ 
                          height: height,
                          width: 16,
                          marginBottom: 8
                        }}
                      />
                      <Text className="text-xs text-gray-500 transform -rotate-45 origin-center">
                        {format(day.date, "d")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-gray-500 text-sm text-center">
                Tap and drag to see daily amounts
              </Text>
            </View>
          </View>
        </View>

        {/* Spending Trends */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Spending Trends
          </Text>
          <View className="space-y-4">
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Ionicons name="trending-down" size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900">Best Day</Text>
                    <Text className="text-gray-500 text-sm">Lowest spending</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900">
                    {formatCurrency(Math.min(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {format(dailySpending.find(d => d.amount === Math.min(...dailySpending.map(d => d.amount)))?.date || now, "MMM d")}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-red-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Ionicons name="trending-up" size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900">Highest Day</Text>
                    <Text className="text-gray-500 text-sm">Most spending</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900">
                    {formatCurrency(Math.max(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {format(dailySpending.find(d => d.amount === Math.max(...dailySpending.map(d => d.amount)))?.date || now, "MMM d")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {expenses.length === 0 && (
          <View className="px-6 py-12 items-center">
            <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
              <Ionicons name="analytics-outline" size={32} color="#6b7280" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No insights yet
            </Text>
            <Text className="text-gray-500 text-center">
              Add some expenses to see your spending insights and patterns
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}