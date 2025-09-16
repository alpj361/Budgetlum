import React from "react";
import { View, Text } from "react-native";
import SelectionCard from "./SelectionCard";
import { PaymentStructure } from "../../types/user";

interface PaymentStructureSelectorProps {
  selectedStructure: PaymentStructure | null;
  onStructureChange: (structure: PaymentStructure) => void;
}

const paymentStructureOptions: PaymentStructure[] = [
  {
    type: "monthly",
    paymentsPerPeriod: 1,
    period: "month",
    description: "Un pago al mes",
  },
  {
    type: "bi-monthly",
    paymentsPerPeriod: 2,
    period: "month",
    description: "Dos pagos por mes",
  },
  {
    type: "bi-weekly",
    paymentsPerPeriod: 26,
    period: "year",
    description: "Cada 14 días exactos",
  },
  {
    type: "weekly",
    paymentsPerPeriod: 52,
    period: "year",
    description: "Cada semana",
  },
  {
    type: "irregular",
    paymentsPerPeriod: 12,
    period: "year",
    description: "Frecuencia variable",
  },
];

const getStructureDetails = (structure: PaymentStructure) => {
  switch (structure.type) {
    case "monthly":
      return {
        icon: "calendar-outline" as const,
        examples: "Ej: El día 30 de cada mes",
        paymentsPerYear: "12 pagos al año",
      };
    case "bi-monthly":
      return {
        icon: "calendar" as const,
        examples: "Ej: 1ro y 15, o quincenas",
        paymentsPerYear: "24 pagos al año",
      };
    case "bi-weekly":
      return {
        icon: "time" as const,
        examples: "Ej: Viernes cada 14 días",
        paymentsPerYear: "26 pagos al año",
      };
    case "weekly":
      return {
        icon: "refresh" as const,
        examples: "Ej: Todos los viernes",
        paymentsPerYear: "52 pagos al año",
      };
    case "irregular":
      return {
        icon: "shuffle" as const,
        examples: "Proyectos, comisiones",
        paymentsPerYear: "Varía",
      };
    default:
      return {
        icon: "help" as const,
        examples: "",
        paymentsPerYear: "",
      };
  }
};

export default function PaymentStructureSelector({
  selectedStructure,
  onStructureChange,
}: PaymentStructureSelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        ¿Con qué frecuencia te pagan?
      </Text>

      <Text className="text-gray-600 mb-4">
        Selecciona el patrón de pagos que mejor describe tu situación laboral
      </Text>

      {/* Educational note */}
      <View className="p-4 bg-blue-50 rounded-xl mb-4">
        <Text className="text-blue-800 text-sm font-medium mb-2">
          💡 ¿Cuál es la diferencia?
        </Text>
        <Text className="text-blue-700 text-sm mb-1">
          📅 <Text className="font-medium">Bi-mensual:</Text> 2 veces por mes = 24 pagos/año
        </Text>
        <Text className="text-blue-700 text-sm">
          ⏰ <Text className="font-medium">Bi-semanal:</Text> Cada 14 días = 26 pagos/año
        </Text>
      </View>

      {paymentStructureOptions.map((structure) => {
        const details = getStructureDetails(structure);
        const isSelected = selectedStructure?.type === structure.type;

        return (
          <View key={structure.type} className="mb-3">
            <SelectionCard
              title={structure.description}
              description={details.examples}
              icon={details.icon}
              isSelected={isSelected}
              onPress={() => onStructureChange(structure)}
            />

            {/* Show additional info when selected */}
            {isSelected && (
              <View className="mt-2 ml-4 p-3 bg-green-50 rounded-lg">
                <Text className="text-green-800 text-sm">
                  ✓ {details.paymentsPerYear}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Show guidance for selected structure */}
      {selectedStructure && (
        <View className="p-4 bg-emerald-50 rounded-xl mt-4">
          <Text className="text-emerald-800 font-medium text-sm text-center">
            {getGuidanceForStructure(selectedStructure)}
          </Text>
        </View>
      )}
    </View>
  );
}

const getGuidanceForStructure = (structure: PaymentStructure): string => {
  switch (structure.type) {
    case "monthly":
      return "📅 Perfecto para salarios mensuales tradicionales";
    case "bi-monthly":
      return "💰 Ideal para trabajos que pagan dos veces al mes";
    case "bi-weekly":
      return "🗓️ Común en empleos por horas y algunos salarios";
    case "weekly":
      return "⏰ Típico para trabajos por horas y empleos semanales";
    case "irregular":
      return "🔄 Para freelancers, comisiones y proyectos";
    default:
      return "";
  }
};