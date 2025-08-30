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
        <View className="px-6 pt-2 pb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Spending Insights
          </Text>
          <Text className="text-gray-600 text-base">
            Understand your spending patterns
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="px-6 mb-8">
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="bg-blue-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalSpent, currency)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">Total Spent</Text>
            </View>
            
            <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="bg-green-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={20} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(avgDailySpending, currency)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">Daily Average</Text>
            </View>
          </View>
        </View>

        {/* Spending by Category */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Spending by Category
            </Text>
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              {categoryInsights.map((insight, index) => (
                <View key={insight.category} className={`${index < categoryInsights.length - 1 ? "mb-5" : ""}`}>
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View 
                        className="w-3 h-3 rounded-full mr-4"
                        style={{ backgroundColor: insight.color }}
                      />
                      <Text className="font-medium text-gray-900 text-base">
                        {insight.category}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-gray-900 text-base">
                        {formatCurrency(insight.totalSpent, currency)}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-0.5">
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
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Daily Spending This Month
          </Text>
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row items-end space-x-1" style={{ width: Math.max(width - 80, dailySpending.length * 12) }}>
                {dailySpending.map((day, index) => {
                  const height = Math.max((day.amount / maxDailySpending) * 90, 4);
                  const isToday = day.date.toDateString() === now.toDateString();
                  
                  return (
                    <View key={index} className="items-center">
                      <View
                        className={`rounded-t ${day.amount > 0 ? "bg-blue-500" : "bg-gray-200"} ${isToday ? "bg-blue-600" : ""}`}
                        style={{ 
                          height: height,
                          width: 10,
                          marginBottom: 6
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
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Spending Trends
          </Text>
          <View style={{ gap: 12 }}>
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-green-100 rounded-full w-11 h-11 items-center justify-center mr-4">
                    <Ionicons name="trending-down-outline" size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900 text-base">Best Day</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">Lowest spending</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900 text-base">
                    {formatCurrency(Math.min(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {format(dailySpending.find(d => d.amount === Math.min(...dailySpending.map(d => d.amount)))?.date || now, "MMM d")}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-red-100 rounded-full w-11 h-11 items-center justify-center mr-4">
                    <Ionicons name="trending-up-outline" size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900 text-base">Highest Day</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">Most spending</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900 text-base">
                    {formatCurrency(Math.max(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
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