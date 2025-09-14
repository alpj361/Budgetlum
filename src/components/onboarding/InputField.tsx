import React, { useState } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
}

export default function InputField({
  label,
  error,
  required,
  icon,
  hint,
  value,
  onChangeText,
  ...textInputProps
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-2">
        <Text className="text-base font-medium text-gray-900">
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      </View>

      <View
        className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${
          error
            ? "border-red-300 bg-red-50"
            : isFocused
            ? "border-blue-300 bg-blue-50"
            : "border-gray-200"
        }`}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? "#ef4444" : isFocused ? "#3b82f6" : "#9ca3af"}
            style={{ marginRight: 12 }}
          />
        )}

        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
      </View>

      {error ? (
        <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>
      ) : hint ? (
        <Text className="text-gray-500 text-sm mt-1 ml-1">{hint}</Text>
      ) : null}
    </View>
  );
}