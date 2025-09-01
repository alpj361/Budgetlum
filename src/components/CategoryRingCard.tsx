import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CircularProgress from "./CircularProgress";
import AnimatedPressable from "./AnimatedPressable";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";

interface Props {
  name: string;
  amount: number;
  percentage: number; // 0-100
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export default function CategoryRingCard({ name, amount, percentage, color, iconName }: Props) {
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const pct = Math.max(0, Math.min(100, percentage));

  return (
    <AnimatedPressable
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="mr-3">
          <CircularProgress size={64} stroke={8} progress={pct / 100} color={color}>
            <View className="items-center justify-center" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              <Ionicons name={iconName} size={20} color={color} />
            </View>
          </CircularProgress>
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-base" numberOfLines={1}>{name}</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text className="text-gray-800 font-bold text-base">{formatCurrency(amount, currency)}</Text>
            <Text className="text-gray-500 text-sm">{pct.toFixed(0)}%</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
