import React from "react";
import { View, Text } from "react-native";
import SelectionCard from "./SelectionCard";

interface IncomeStabilitySelectorProps {
  selectedStability: "consistent" | "seasonal" | "variable" | "";
  onStabilityChange: (stability: "consistent" | "seasonal" | "variable") => void;
}

const stabilityOptions = [
  {
    id: "consistent" as const,
    title: "Constante",
    description: "El mismo monto cada mes",
    icon: "checkmark-circle" as const,
    guidance: "Perfecto, esto hará que tu presupuesto sea muy predecible 📊",
  },
  {
    id: "seasonal" as const,
    title: "Varía un poco",
    description: "Cambios estacionales o pequeñas variaciones",
    icon: "trending-up" as const,
    guidance: "Vamos a presupuestar con el monto más bajo para mantenerte seguro 🛡️",
  },
  {
    id: "variable" as const,
    title: "Muy variable",
    description: "Proyectos, comisiones, freelance",
    icon: "shuffle" as const,
    guidance: "Crearemos un presupuesto conservador basado en tus meses más bajos 💪",
  },
];

export default function IncomeStabilitySelector({
  selectedStability,
  onStabilityChange,
}: IncomeStabilitySelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        ¿Cómo es tu ingreso mes a mes?
      </Text>

      <View className="p-4 bg-blue-50 rounded-xl mb-4">
        <Text className="text-blue-800 text-sm">
          💡 <Text className="font-medium">Consejo:</Text> Solo incluye tu ingreso base confiable. Los bonos, horas extra, y comisiones variables los agregaremos después como "extras".
        </Text>
      </View>

      {stabilityOptions.map((option) => (
        <SelectionCard
          key={option.id}
          title={option.title}
          description={option.description}
          icon={option.icon}
          isSelected={selectedStability === option.id}
          onPress={() => onStabilityChange(option.id)}
        />
      ))}

      {/* Show guidance for selected option */}
      {selectedStability && (
        <View className="p-4 bg-green-50 rounded-xl mt-4">
          <Text className="text-green-800 text-sm text-center">
            {stabilityOptions.find(opt => opt.id === selectedStability)?.guidance}
          </Text>
        </View>
      )}
    </View>
  );
}