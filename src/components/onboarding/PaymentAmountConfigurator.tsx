import React, { useState } from "react";
import { View, Text } from "react-native";
import AnimatedPressable from "../AnimatedPressable";
import InputField from "./InputField";
import PaymentSchedulePreview from "./PaymentSchedulePreview";
import { PaymentStructure } from "../../types/user";
import { getPaymentAmountLabels, getMaxPaymentsForStructure } from "../../utils/incomeCalculations";

interface PaymentAmountConfiguratorProps {
  paymentStructure: PaymentStructure;
  amounts: number[];
  onAmountsChange: (amounts: number[]) => void;
  stabilityPattern: "consistent" | "seasonal" | "variable";
  variableType?: "range" | "cycles";
  errors: { [key: string]: string };
}

export default function PaymentAmountConfigurator({
  paymentStructure,
  amounts,
  onAmountsChange,
  stabilityPattern,
  variableType,
  errors,
}: PaymentAmountConfiguratorProps) {
  const [amountType, setAmountType] = useState<"same" | "different">("same");

  const labels = getPaymentAmountLabels(paymentStructure);
  const maxPayments = getMaxPaymentsForStructure(paymentStructure);

  // Show different amounts option for structures that support it
  const showAmountTypeChoice = maxPayments > 1 &&
    (paymentStructure.type === "bi-monthly" ||
     (stabilityPattern !== "consistent" && variableType === "cycles"));

  const handleAmountChange = (index: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newAmounts = [...amounts];

    if (amountType === "same" && maxPayments > 1) {
      // Update all amounts to be the same
      for (let i = 0; i < maxPayments; i++) {
        newAmounts[i] = numericValue;
      }
    } else {
      newAmounts[index] = numericValue;
    }

    onAmountsChange(newAmounts);
  };

  const getAmountInputs = () => {
    if (amountType === "same" && maxPayments > 1) {
      return (
        <InputField
          label={`Monto ${paymentStructure.type === "bi-monthly" ? "por pago" : "por período"}`}
          placeholder="0"
          value={amounts[0]?.toString() || ""}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9.]/g, '');
            handleAmountChange(0, numericText);
          }}
          keyboardType="decimal-pad"
          icon="cash"
          error={errors.incomeAmount}
          required
        />
      );
    }

    return labels.map((label, index) => (
      <InputField
        key={index}
        label={label}
        placeholder="0"
        value={amounts[index]?.toString() || ""}
        onChangeText={(text) => {
          const numericText = text.replace(/[^0-9.]/g, '');
          handleAmountChange(index, numericText);
        }}
        keyboardType="decimal-pad"
        icon="cash"
        error={index === 0 ? errors.incomeAmount : ""}
        required={index === 0}
      />
    ));
  };

  return (
    <View>
      {/* Amount type selection for applicable structures */}
      {showAmountTypeChoice && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {paymentStructure.type === "bi-monthly"
              ? "¿Cómo son tus dos pagos mensuales?"
              : "¿Cómo son los pagos en tu ciclo?"
            }
          </Text>

          <View className="flex-row mb-4">
            <AnimatedPressable
              onPress={() => setAmountType("same")}
              className={`flex-1 p-3 rounded-xl border mr-2 ${
                amountType === "same"
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  amountType === "same" ? "text-blue-700" : "text-gray-700"
                }`}
              >
                Mismo monto
              </Text>
              <Text
                className={`text-center text-xs mt-1 ${
                  amountType === "same" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                Ej: $800 + $800
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setAmountType("different")}
              className={`flex-1 p-3 rounded-xl border ml-2 ${
                amountType === "different"
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  amountType === "different" ? "text-blue-700" : "text-gray-700"
                }`}
              >
                Montos diferentes
              </Text>
              <Text
                className={`text-center text-xs mt-1 ${
                  amountType === "different" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                Ej: $600 + $1000
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* Amount inputs */}
      <View className="mb-4">
        {getAmountInputs()}
      </View>

      {/* Educational note for specific structures */}
      {paymentStructure.type === "bi-weekly" && (
        <View className="p-4 bg-amber-50 rounded-xl mb-4">
          <Text className="text-amber-800 text-sm">
            💡 <Text className="font-medium">Bi-semanal:</Text> Algunos meses recibirás 3 pagos en lugar de 2, lo que aumentará tus ingresos esos meses.
          </Text>
        </View>
      )}

      {paymentStructure.type === "weekly" && (
        <View className="p-4 bg-amber-50 rounded-xl mb-4">
          <Text className="text-amber-800 text-sm">
            💡 <Text className="font-medium">Semanal:</Text> Algunos meses tendrás 5 pagos en lugar de 4, aumentando tus ingresos esos meses.
          </Text>
        </View>
      )}

      {/* Payment schedule preview */}
      {amounts.some(amt => amt > 0) && (
        <PaymentSchedulePreview
          paymentStructure={paymentStructure}
          amounts={amounts}
        />
      )}
    </View>
  );
}