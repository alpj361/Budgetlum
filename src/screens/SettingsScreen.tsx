import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { CURRENCIES, CurrencyCode } from "../types/currency";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const primary = useSettingsStore((s) => s.primaryCurrency);
  const setPrimary = useSettingsStore((s) => s.setPrimaryCurrency);
  const [open, setOpen] = useState(false);

  const current = CURRENCIES.find((c) => c.code === primary) || CURRENCIES[0];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-6 flex-1">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Configuración</Text>
        <Text className="text-gray-600 mb-4">Selecciona tu moneda principal</Text>

        {/* Dropdown selector */}
        <View className="mb-4">
          <AnimatedPressable
            className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex-row items-center justify-between"
            onPress={() => setOpen((s) => !s)}
          >
            <View className="flex-row items-center">
              <Text className="text-gray-900 font-semibold mr-2">{current.symbol} {current.code}</Text>
              <Text className="text-gray-500 text-xs">{current.name}</Text>
            </View>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
          </AnimatedPressable>

          {open && (
            <View>
              {/* Backdrop to close */}
              <Pressable className="absolute -top-4 left-0 right-0 bottom-0" onPress={() => setOpen(false)} />
              <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-[280px]">
                <ScrollView className="max-h-[280px]">
                  {CURRENCIES.map((c) => (
                    <AnimatedPressable
                      key={c.code}
                      className={`px-4 py-3 ${primary === c.code ? "bg-blue-50" : ""}`}
                      onPress={() => {
                        setPrimary(c.code as CurrencyCode);
                        setOpen(false);
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-gray-900 font-semibold">{c.symbol} {c.code}</Text>
                          <Text className="text-gray-500 text-xs">{c.name}</Text>
                        </View>
                        {primary === c.code && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                      </View>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Quick grid (kept) */}
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
