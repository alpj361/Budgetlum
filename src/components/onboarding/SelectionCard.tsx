import React from "react";
import { View, Text } from "react-native";
import AnimatedPressable from "../AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";

interface SelectionCardProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: "green" | "blue" | "yellow" | "red";
  compact?: boolean;
}

export default function SelectionCard({
  title,
  description,
  icon,
  isSelected,
  onPress,
  disabled = false,
  badge,
  badgeColor = "blue",
  compact = false,
}: SelectionCardProps) {
  const getBadgeColors = () => {
    switch (badgeColor) {
      case "green":
        return "bg-green-100 text-green-800 border-green-200";
      case "blue":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "yellow":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "red":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      className={`${compact ? "p-3" : "p-4"} rounded-xl border-2 mb-3 ${
        disabled
          ? "bg-gray-100 border-gray-200"
          : isSelected
          ? "bg-blue-50 border-blue-500"
          : "bg-white border-gray-200"
      }`}
    >
      <View className="flex-row items-start">
        {icon && !compact && (
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              disabled
                ? "bg-gray-200"
                : isSelected
                ? "bg-blue-500"
                : "bg-gray-100"
            }`}
          >
            <Ionicons
              name={icon}
              size={20}
              color={
                disabled
                  ? "#9ca3af"
                  : isSelected
                  ? "#ffffff"
                  : "#6b7280"
              }
            />
          </View>
        )}

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className={`${compact ? "text-sm" : "text-base"} font-semibold ${
                disabled
                  ? "text-gray-400"
                  : isSelected
                  ? "text-blue-900"
                  : "text-gray-900"
              }`}
            >
              {title}
            </Text>
            {badge && (
              <View className={`px-2 py-1 rounded-full border ${getBadgeColors()}`}>
                <Text className="text-xs font-medium">
                  {badge}
                </Text>
              </View>
            )}
          </View>
          {description && !compact && (
            <Text
              className={`text-sm leading-5 ${
                disabled
                  ? "text-gray-400"
                  : isSelected
                  ? "text-blue-700"
                  : "text-gray-600"
              }`}
            >
              {description}
            </Text>
          )}
        </View>

        {isSelected && !disabled && (
          <View className="ml-2">
            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}