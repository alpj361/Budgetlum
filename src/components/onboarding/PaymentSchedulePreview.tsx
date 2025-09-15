import React from "react";
import { View, Text } from "react-native";
import { PaymentStructure } from "../../types/user";
import { getPaymentSchedulePreview } from "../../utils/incomeCalculations";

interface PaymentSchedulePreviewProps {
  paymentStructure: PaymentStructure;
  amounts: number[];
}

export default function PaymentSchedulePreview({
  paymentStructure,
  amounts,
}: PaymentSchedulePreviewProps) {
  if (!amounts.length || amounts.every(amt => amt <= 0)) {
    return null;
  }

  const schedule = getPaymentSchedulePreview(paymentStructure, amounts);

  return (
    <View className="p-4 bg-purple-50 rounded-xl mt-4">
      <Text className="text-purple-800 font-semibold text-center mb-3">
        📅 Vista previa de tus pagos
      </Text>

      {schedule.map((monthData, index) => (
        <View key={index} className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-purple-900 font-medium">
              {monthData.month}
            </Text>
            <Text className="text-purple-900 font-bold">
              ${monthData.total.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row flex-wrap">
            {monthData.payments.map((payment, payIndex) => (
              <View
                key={payIndex}
                className="bg-purple-100 rounded-lg px-2 py-1 mr-2 mb-1"
              >
                <Text className="text-purple-800 text-xs">
                  {payment.date}: ${payment.amount.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className="border-t border-purple-200 pt-3 mt-3">
        <Text className="text-purple-700 text-sm text-center">
          {getScheduleExplanation(paymentStructure)}
        </Text>
      </View>
    </View>
  );
}

const getScheduleExplanation = (structure: PaymentStructure): string => {
  switch (structure.type) {
    case "monthly":
      return "Un pago fijo cada mes";
    case "bi-monthly":
      return "Dos pagos por mes = ingresos más consistentes";
    case "bi-weekly":
      return "Cada 14 días = algunos meses tendrás 3 pagos";
    case "weekly":
      return "Cada semana = algunos meses tendrás 5 pagos";
    case "quarterly":
      return "Cada 3 meses = divide entre 3 para el promedio mensual";
    case "irregular":
      return "Frecuencia variable = usa este estimado mensual";
    default:
      return "";
  }
};