import React, { useEffect } from "react";
import { View, Text } from "react-native";
import InputField from "./InputField";
import { IncomeRange } from "../../types/user";

interface IncomeRangeCollectorProps {
  stabilityPattern: "seasonal" | "variable";
  frequency: string;
  incomeRange: IncomeRange;
  onRangeChange: (range: IncomeRange) => void;
  errors: { [key: string]: string };
}

export default function IncomeRangeCollector({
  stabilityPattern,
  frequency,
  incomeRange,
  onRangeChange,
  errors,
}: IncomeRangeCollectorProps) {
  // Auto-calculate averageLow when lowest changes
  useEffect(() => {
    if (incomeRange.lowest > 0 && incomeRange.highest > 0) {
      const averageLow = stabilityPattern === "seasonal"
        ? (incomeRange.lowest + incomeRange.highest) * 0.4 // 40% weighting toward low for seasonal
        : incomeRange.lowest; // Use lowest for variable income budgeting

      onRangeChange({
        ...incomeRange,
        averageLow,
      });
    }
  }, [incomeRange.lowest, incomeRange.highest, stabilityPattern]);

  const getTitle = () => {
    if (stabilityPattern === "seasonal") {
      return "Cuéntanos sobre tu rango de ingresos";
    }
    return "Ayúdanos a entender tu rango de ingresos";
  };

  const getSubtitle = () => {
    if (stabilityPattern === "seasonal") {
      return "Piensa en tus últimos 6-12 meses, ¿cuáles fueron tus meses más bajos y más altos?";
    }
    return "Basándonos en tus últimos 3-6 meses, ¿cuáles son tus rangos típicos?";
  };

  const frequencyLabel = {
    weekly: "por semana",
    "bi-weekly": "por quincena",
    monthly: "por mes",
    quarterly: "por trimestre",
  }[frequency] || "por período";

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        {getTitle()}
      </Text>

      <Text className="text-gray-600 mb-4">
        {getSubtitle()}
      </Text>

      <InputField
        label={`Monto más bajo ${frequencyLabel}`}
        placeholder="0"
        value={incomeRange.lowest.toString() || ""}
        onChangeText={(text) => {
          const numericText = text.replace(/[^0-9.]/g, '');
          const lowest = parseFloat(numericText) || 0;
          onRangeChange({ ...incomeRange, lowest });
        }}
        keyboardType="decimal-pad"
        icon="trending-down"
        error={errors.lowestIncome}
        required
      />

      <InputField
        label={`Monto más alto ${frequencyLabel}`}
        placeholder="0"
        value={incomeRange.highest.toString() || ""}
        onChangeText={(text) => {
          const numericText = text.replace(/[^0-9.]/g, '');
          const highest = parseFloat(numericText) || 0;
          onRangeChange({ ...incomeRange, highest });
        }}
        keyboardType="decimal-pad"
        icon="trending-up"
        error={errors.highestIncome}
        required
      />

      {/* Budget Preview */}
      {incomeRange.averageLow > 0 && (
        <View className="p-4 bg-amber-50 rounded-xl mt-4">
          <Text className="text-amber-800 font-semibold text-center mb-1">
            🛡️ Tu presupuesto se basará en: ${incomeRange.averageLow.toLocaleString()} {frequencyLabel}
          </Text>
          <Text className="text-amber-700 text-sm text-center">
            {stabilityPattern === "seasonal"
              ? "Monto conservador para cubrir tus meses más bajos"
              : "Usando tu ingreso mínimo para un presupuesto seguro"
            }
          </Text>
        </View>
      )}

      <View className="p-4 bg-blue-50 rounded-xl mt-4">
        <Text className="text-blue-800 text-sm">
          💡 <Text className="font-medium">¿Por qué conservador?</Text> Es mejor subestimar y tener sorpresas positivas que crear un presupuesto que no puedas cumplir. Los meses buenos serán para ahorros extra.
        </Text>
      </View>
    </View>
  );
}