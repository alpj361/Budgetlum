import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";

interface Props {
  totalSpent: number;
  totalBudget: number;
}

export default function BalanceCard({ totalSpent, totalBudget }: Props) {
  const hasBudget = totalBudget > 0;
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const usedPct = hasBudget ? Math.min((totalSpent / totalBudget) * 100, 999) : 0;
  const balance = hasBudget ? totalBudget - totalSpent : 0;
  const over = hasBudget && balance < 0;

  const progressColor = over ? "#ef4444" : "#3b82f6"; // red or blue-600

  return (
    <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-gray-600 text-sm font-medium">
            {hasBudget ? "Current Balance" : "This Month Spent"}
          </Text>
          <Text className="text-gray-900 text-3xl font-bold mt-1">
            {hasBudget ? `${formatCurrency(Math.abs(balance), currency)}` : `${formatCurrency(totalSpent, currency)}`}
          </Text>
          {hasBudget && (
            <Text className={`${over ? "text-red-500" : "text-gray-500"} mt-1`}>
              {over ? "Over budget" : "Remaining of total budget"}
            </Text>
          )}
        </View>
        <View className="bg-blue-50 rounded-full p-3">
          <Ionicons name="wallet" size={24} color="#3b82f6" />
        </View>
      </View>

      {hasBudget && (
        <View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600 text-sm">Budget Used</Text>
            <Text className="text-gray-700 text-sm font-medium">{Math.min(usedPct, 100).toFixed(0)}%</Text>
          </View>
          <View className="bg-gray-200 rounded-full h-3">
            <View
              className="rounded-full h-3"
              style={{ width: `${Math.min(usedPct, 100)}%`, backgroundColor: progressColor }}
            />
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-500 text-xs">Spent {formatCurrency(totalSpent, currency)}</Text>
            <Text className="text-gray-500 text-xs">Budget {formatCurrency(totalBudget, currency)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
