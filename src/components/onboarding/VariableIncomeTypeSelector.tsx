import React from "react";
import { View, Text } from "react-native";
import SelectionCard from "./SelectionCard";

interface VariableIncomeTypeSelectorProps {
  selectedType: "range" | "cycles" | "";
  onTypeChange: (type: "range" | "cycles") => void;
  stabilityPattern: "seasonal" | "variable";
  frequency: string;
}

const getTypeOptions = (stabilityPattern: "seasonal" | "variable", frequency: string) => {
  const baseOptions = [
    {
      id: "range" as const,
      title: "Rango variable",
      description: stabilityPattern === "seasonal"
        ? "Varía entre temporadas (ej: $800-$1200)"
        : "Cantidad impredecible cada vez",
      icon: "bar-chart" as const,
    },
  ];

  // Only show cycles option for predictable frequencies
  if (frequency !== "irregular") {
    baseOptions.push({
      id: "cycles" as const,
      title: "Ciclo específico",
      description: "Cantidades específicas en orden predecible",
      icon: "refresh" as const,
    });
  }

  return baseOptions;
};

const getGuidanceText = (stabilityPattern: "seasonal" | "variable") => {
  if (stabilityPattern === "seasonal") {
    return {
      title: "¿Cómo funciona tu variación estacional?",
      subtitle: "Elige la opción que mejor describe tu situación:",
      examples: [
        "📊 Rango: 'Gano entre $800-$1200 dependiendo de la temporada'",
        "🔄 Ciclo: 'Primer mes $800, segundo mes $1000, tercer mes $1200, se repite'",
      ],
    };
  }

  return {
    title: "¿Cómo es tu patrón de ingresos variable?",
    subtitle: "Elige la opción que mejor describe tu situación:",
    examples: [
      "📊 Rango: 'Puede ser cualquier cantidad entre $500-$2000'",
      "🔄 Ciclo: 'Primera quincena $600, segunda quincena $900, se repite'",
    ],
  };
};

export default function VariableIncomeTypeSelector({
  selectedType,
  onTypeChange,
  stabilityPattern,
  frequency,
}: VariableIncomeTypeSelectorProps) {
  const options = getTypeOptions(stabilityPattern, frequency);
  const guidance = getGuidanceText(stabilityPattern);

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        {guidance.title}
      </Text>

      <Text className="text-gray-600 mb-4">
        {guidance.subtitle}
      </Text>

      <View className="p-4 bg-blue-50 rounded-xl mb-4">
        <Text className="text-blue-800 text-sm font-medium mb-2">
          💡 Ejemplos:
        </Text>
        {guidance.examples.map((example, index) => (
          <Text key={index} className="text-blue-700 text-sm mb-1">
            {example}
          </Text>
        ))}
      </View>

      {options.map((option) => (
        <SelectionCard
          key={option.id}
          title={option.title}
          description={option.description}
          icon={option.icon}
          isSelected={selectedType === option.id}
          onPress={() => onTypeChange(option.id)}
        />
      ))}

      {/* Show guidance for selected option */}
      {selectedType && (
        <View className="p-4 bg-green-50 rounded-xl mt-4">
          <Text className="text-green-800 text-sm text-center">
            {selectedType === "range"
              ? "👍 Configuraremos un presupuesto conservador basado en tu rango mínimo"
              : "👍 Podrás definir tus pagos específicos para crear un presupuesto preciso"
            }
          </Text>
        </View>
      )}
    </View>
  );
}