import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { CURRENCIES, CurrencyCode } from "../types/currency";
import { useSettingsStore } from "../state/settingsStore";
import { useUserStore } from "../state/userStore";
import { formatCurrency } from "../utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function SettingsScreen() {
  const primary = useSettingsStore((s) => s.primaryCurrency);
  const setPrimary = useSettingsStore((s) => s.setPrimaryCurrency);
  const resetUserData = useUserStore((s) => s.resetUserData);
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const current = CURRENCIES.find((c) => c.code === primary) || CURRENCIES[0];

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reiniciar Onboarding",
      "¿Estás seguro de que quieres reiniciar el proceso de configuración inicial? Esto borrará todos tus datos de usuario.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: () => {
            resetUserData();
            // Navigate back to root and let AppNavigator handle the onboarding redirect
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' as never }],
            });
          },
        },
      ]
    );
  };

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

        {/* Reset Onboarding Button */}
        <View className="mt-8 pt-6 border-t border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Configuración Avanzada</Text>
          <AnimatedPressable
            onPress={handleResetOnboarding}
            style={{
              backgroundColor: '#fee2e2',
              borderColor: '#fecaca',
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="refresh" size={20} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 16 }}>
              Reiniciar Onboarding
            </Text>
          </AnimatedPressable>
          <Text className="text-gray-500 text-sm mt-2 text-center">
            Esto borrará todos tus datos y reiniciará el proceso de configuración inicial
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
