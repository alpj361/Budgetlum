import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  totalSpent: number;
  totalBudget: number;
}

export default function BalanceCard({ totalSpent, totalBudget }: Props) {
  const hasBudget = totalBudget > 0;
  const usedPct = hasBudget ? Math.min((totalSpent / totalBudget) * 100, 999) : 0;
  const balance = hasBudget ? totalBudget - totalSpent : 0;
  const over = hasBudget && balance < 0;

  const progressColor = over ? "#ef4444" : "#34d399"; // red or emerald

  return (
    <LinearGradient
      colors={["#0b1220", "#111827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-2xl p-6"
    >
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-blue-100 text-sm font-medium">
            {hasBudget ? "Current Balance" : "This Month Spent"}
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {hasBudget ? `$${Math.abs(balance).toFixed(2)}` : `$${totalSpent.toFixed(2)}`}
          </Text>
          {hasBudget && (
            <Text className="text-blue-200 mt-1">
              {over ? "Over budget" : "Remaining of total budget"}
            </Text>
          )}
        </View>
        <View className="bg-white/15 rounded-full p-3">
          <Ionicons name="wallet" size={24} color="#ffffff" />
        </View>
      </View>

      {hasBudget && (
        <View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-blue-100 text-sm">Budget Used</Text>
            <Text className="text-white text-sm font-medium">{Math.min(usedPct, 100).toFixed(0)}%</Text>
          </View>
          <View className="rounded-full h-3" style={{ backgroundColor: "rgba(148,163,184,0.35)" }}>
            <View
              className="rounded-full h-3"
              style={{ width: `${Math.min(usedPct, 100)}%`, backgroundColor: progressColor }}
            />
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-blue-100 text-xs">Spent ${totalSpent.toFixed(2)}</Text>
            <Text className="text-blue-100 text-xs">Budget ${totalBudget.toFixed(2)}</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}
