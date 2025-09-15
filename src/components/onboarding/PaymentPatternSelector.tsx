import React from "react";
import { View, Text } from "react-native";
import SelectionCard from "./SelectionCard";

interface PaymentPatternSelectorProps {
  selectedPattern: "simple" | "complex" | "";
  onPatternChange: (pattern: "simple" | "complex") => void;
  frequency: string;
}

const getPatternOptions = (frequency: string) => {
  const baseOptions = [
    {
      id: "simple" as const,
      title: "Mismo monto siempre",
      description: "Recibes la misma cantidad cada vez",
      icon: "cash-outline" as const,
    },
  ];

  if (frequency && frequency !== "irregular") {
    baseOptions.push({
      id: "complex" as const,
      title: "Montos variables",
      description: "Recibes diferentes cantidades en un ciclo",
      icon: "analytics-outline" as const,
    });
  }

  return baseOptions;
};

export default function PaymentPatternSelector({
  selectedPattern,
  onPatternChange,
  frequency,
}: PaymentPatternSelectorProps) {
  const options = getPatternOptions(frequency);

  if (options.length <= 1) {
    return null; // Don't show selector if only one option
  }

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        ¿Cómo recibes este ingreso?
      </Text>

      {options.map((option) => (
        <SelectionCard
          key={option.id}
          title={option.title}
          description={option.description}
          icon={option.icon}
          isSelected={selectedPattern === option.id}
          onPress={() => onPatternChange(option.id)}
        />
      ))}
    </View>
  );
}