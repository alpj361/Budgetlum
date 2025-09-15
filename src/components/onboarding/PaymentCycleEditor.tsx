import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import AnimatedPressable from "../AnimatedPressable";
import InputField from "./InputField";
import { PaymentCycle } from "../../types/user";
import { Ionicons } from "@expo/vector-icons";

interface PaymentCycleEditorProps {
  frequency: string;
  cycles: PaymentCycle[];
  onCyclesChange: (cycles: PaymentCycle[]) => void;
}

const getFrequencyInfo = (frequency: string) => {
  switch (frequency) {
    case "weekly":
      return {
        maxCycles: 4,
        cycleLabel: "Semana",
        examples: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
      };
    case "bi-weekly":
      return {
        maxCycles: 2,
        cycleLabel: "Quincena",
        examples: ["Primera quincena", "Segunda quincena"],
      };
    case "monthly":
      return {
        maxCycles: 4,
        cycleLabel: "Pago",
        examples: ["Pago 1", "Pago 2", "Pago 3", "Pago 4"],
      };
    default:
      return {
        maxCycles: 6,
        cycleLabel: "Pago",
        examples: ["Pago 1", "Pago 2", "Pago 3", "Pago 4", "Pago 5", "Pago 6"],
      };
  }
};

export default function PaymentCycleEditor({
  frequency,
  cycles,
  onCyclesChange,
}: PaymentCycleEditorProps) {
  const [editingAmount, setEditingAmount] = useState<string>("");
  const [editingDescription, setEditingDescription] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const frequencyInfo = getFrequencyInfo(frequency);

  const generateId = () => `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addCycle = () => {
    if (cycles.length >= frequencyInfo.maxCycles) {
      Alert.alert("Límite alcanzado", `Solo puedes tener ${frequencyInfo.maxCycles} pagos por ${frequency === "monthly" ? "mes" : "ciclo"}.`);
      return;
    }

    const newCycle: PaymentCycle = {
      id: generateId(),
      amount: 0,
      description: frequencyInfo.examples[cycles.length] || `${frequencyInfo.cycleLabel} ${cycles.length + 1}`,
    };

    setEditingIndex(cycles.length);
    setEditingAmount("");
    setEditingDescription(newCycle.description);
    onCyclesChange([...cycles, newCycle]);
  };

  const updateCycle = (index: number, updates: Partial<PaymentCycle>) => {
    const updatedCycles = cycles.map((cycle, i) =>
      i === index ? { ...cycle, ...updates } : cycle
    );
    onCyclesChange(updatedCycles);
  };

  const removeCycle = (index: number) => {
    if (cycles.length <= 1) {
      Alert.alert("Error", "Debe tener al menos un pago configurado.");
      return;
    }

    Alert.alert(
      "Eliminar pago",
      "¿Estás seguro de que quieres eliminar este pago?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            const updatedCycles = cycles.filter((_, i) => i !== index);
            onCyclesChange(updatedCycles);
            if (editingIndex === index) {
              setEditingIndex(-1);
            }
          },
        },
      ]
    );
  };

  const saveEdit = () => {
    if (!editingAmount.trim() || parseFloat(editingAmount) <= 0) {
      Alert.alert("Error", "Ingresa un monto válido.");
      return;
    }

    updateCycle(editingIndex, {
      amount: parseFloat(editingAmount),
      description: editingDescription.trim() || `${frequencyInfo.cycleLabel} ${editingIndex + 1}`,
    });

    setEditingIndex(-1);
    setEditingAmount("");
    setEditingDescription("");
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditingAmount("");
    setEditingDescription("");
  };

  const startEdit = (index: number) => {
    const cycle = cycles[index];
    setEditingIndex(index);
    setEditingAmount(cycle.amount.toString());
    setEditingDescription(cycle.description || "");
  };

  const totalAmount = cycles.reduce((sum, cycle) => sum + cycle.amount, 0);

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-900">
          Pagos en el ciclo
        </Text>
        {cycles.length < frequencyInfo.maxCycles && (
          <AnimatedPressable
            onPress={addCycle}
            className="flex-row items-center bg-blue-600 rounded-lg py-2 px-3"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-medium ml-1">Agregar</Text>
          </AnimatedPressable>
        )}
      </View>

      {cycles.map((cycle, index) => (
        <View
          key={cycle.id}
          className="bg-white rounded-xl border border-gray-200 p-4 mb-3"
        >
          {editingIndex === index ? (
            // Edit mode
            <View>
              <InputField
                label="Descripción"
                placeholder="Ej: Primera quincena"
                value={editingDescription}
                onChangeText={setEditingDescription}
                icon="document-text"
              />

              <InputField
                label="Monto"
                placeholder="0"
                value={editingAmount}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9.]/g, '');
                  setEditingAmount(numericText);
                }}
                keyboardType="decimal-pad"
                icon="cash"
              />

              <View className="flex-row justify-end mt-3">
                <AnimatedPressable
                  onPress={cancelEdit}
                  className="bg-gray-200 rounded-lg py-2 px-4 mr-2"
                >
                  <Text className="text-gray-700 font-medium">Cancelar</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={saveEdit}
                  className="bg-blue-600 rounded-lg py-2 px-4"
                >
                  <Text className="text-white font-medium">Guardar</Text>
                </AnimatedPressable>
              </View>
            </View>
          ) : (
            // Display mode
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">
                  {cycle.description}
                </Text>
                <Text className="text-2xl font-bold text-blue-600 mt-1">
                  ${cycle.amount.toLocaleString()}
                </Text>
              </View>

              <View className="flex-row">
                <AnimatedPressable
                  onPress={() => startEdit(index)}
                  className="p-2 mr-1"
                >
                  <Ionicons name="pencil" size={18} color="#6b7280" />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => removeCycle(index)}
                  className="p-2"
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </AnimatedPressable>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Total Display */}
      {totalAmount > 0 && (
        <View className="bg-green-50 rounded-xl p-4 mt-4">
          <Text className="text-green-800 font-semibold text-center">
            💰 {frequency === "monthly" ? "Total mensual" : `Total por ${frequency === "weekly" ? "4 semanas" : "ciclo"}`}: ${totalAmount.toLocaleString()}
          </Text>
          {frequency !== "monthly" && (
            <Text className="text-green-600 text-sm text-center mt-1">
              Estimado mensual: ${getMonthlyEstimate(totalAmount, frequency).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const getMonthlyEstimate = (cycleTotal: number, frequency: string): number => {
  switch (frequency) {
    case "weekly": return cycleTotal * 4.33;
    case "bi-weekly": return cycleTotal * 2.17;
    case "monthly": return cycleTotal;
    default: return cycleTotal;
  }
};