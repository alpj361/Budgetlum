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
}

export default function SelectionCard({
  title,
  description,
  icon,
  isSelected,
  onPress,
  disabled = false,
}: SelectionCardProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      className={`p-4 rounded-xl border-2 mb-3 ${
        disabled
          ? "bg-gray-100 border-gray-200"
          : isSelected
          ? "bg-blue-50 border-blue-500"
          : "bg-white border-gray-200"
      }`}
    >
      <View className="flex-row items-start">
        {icon && (
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
          <Text
            className={`text-base font-semibold mb-1 ${
              disabled
                ? "text-gray-400"
                : isSelected
                ? "text-blue-900"
                : "text-gray-900"
            }`}
          >
            {title}
          </Text>
          {description && (
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