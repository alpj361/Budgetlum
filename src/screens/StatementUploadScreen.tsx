import React, { useState } from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useExpenseStore } from "../state/expenseStore";
import AnimatedPressable from "../components/AnimatedPressable";
import { processStatementText } from "../utils/statement/processStatement";

export default function StatementUploadScreen() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReturnType<typeof Array> | any[]>([]);
  const { addExpense } = useExpenseStore();

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/plain", "application/ofx", "application/x-qif", "*/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setFileName(asset.name);
    try {
      setLoading(true);
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = await processStatementText(asset.name || "statement.txt", text);
      setItems(parsed);
    } catch (e: any) {
      setError("No se pudo leer o analizar el archivo. Prueba con CSV/TXT/OFX/QIF.");
    } finally {
      setLoading(false);
    }
  };

  const importAll = () => {
    items.forEach((e) => {
      addExpense({ amount: e.amount, description: e.description, category: e.category, date: e.date });
    });
    setItems([]);
    setFileName(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Subir estado de cuenta</Text>
        <Text className="text-gray-600 mb-4">Selecciona un archivo CSV/TXT/OFX/QIF. La IA detectará y categorizará tus gastos.</Text>

        <AnimatedPressable className="bg-blue-600 rounded-xl py-4 items-center mb-4" onPress={pickFile}>
          <Text className="text-white font-semibold">Seleccionar archivo</Text>
        </AnimatedPressable>

        {fileName && (
          <View className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
            <Text className="text-gray-900 font-medium">Archivo: {fileName}</Text>
          </View>
        )}

        {loading && (
          <View className="items-center py-8">
            <ActivityIndicator color="#3b82f6" />
            <Text className="text-gray-600 mt-2">Analizando archivo con IA…</Text>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        {items.length > 0 && (
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold mb-2">Gastos detectados ({items.length})</Text>
            <FlatList<any>
              data={items as any[]}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <View className="bg-white border border-gray-100 rounded-xl p-3 mb-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-900 font-medium flex-1 mr-2">{item.description}</Text>
                    <Text className="text-gray-900 font-semibold">-${Number(item.amount).toFixed(2)}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">{item.category}</Text>
                    <Text className="text-gray-500 text-sm">{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
            />
            <AnimatedPressable className="bg-green-600 rounded-xl py-4 items-center mt-4" onPress={importAll}>
              <Text className="text-white font-semibold">Importar {items.length} gastos</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
