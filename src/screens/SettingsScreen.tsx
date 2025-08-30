import React from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { CURRENCIES, CurrencyCode } from "../types/currency";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";

export default function SettingsScreen() {
  const primary = useSettingsStore((s) => s.primaryCurrency);
  const setPrimary = useSettingsStore((s) => s.setPrimaryCurrency);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Configuración</Text>
        <Text className="text-gray-600 mb-4">Selecciona tu moneda principal</Text>

        <View className="flex-row flex-wrap -m-1">
          {CURRENCIES.map((c) => (
            <AnimatedPressable
              key={c.code}
              onPress={() => setPrimary(c.code as CurrencyCode)}
              className={`m-1 px-4 py-3 rounded-xl border ${primary === c.code ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
            >
              <Text className={`${primary === c.code ? "text-white" : "text-gray-900"} font-semibold`}>{c.symbol} {c.code}</Text>
              <Text className={`${primary === c.code ? "text-blue-100" : "text-gray-500"} text-xs`}>{c.name}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <View className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mt-6">
          <Text className="text-gray-600 mb-1">Vista previa</Text>
          <Text className="text-gray-900 font-semibold text-lg">{formatCurrency(1234.56, primary)}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
