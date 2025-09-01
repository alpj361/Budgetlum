import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import CategoryPickerModal from "../components/CategoryPickerModal";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { useExpenseStore } from "../state/expenseStore";
import { categorizeExpense } from "../utils/aiCategorization";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSettingsStore } from "../state/settingsStore";
import { getCurrencySymbol } from "../utils/currency";
import { getLabelsFromIds, findCategoryByLabel } from "../types/categories";
import { suggestCategory } from "../utils/category/heuristics";

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<{ categoryId?: string; subcategoryId?: string }>({});
  const [suggested, setSuggested] = useState<{ categoryId?: string; subcategoryId?: string; confidence?: number } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const navigation = useNavigation<any>();
  const { addExpense } = useExpenseStore();
  const currency = useSettingsStore((s) => s.primaryCurrency);


  // Heuristic suggestion updates as user types
  useEffect(() => {
    const s = suggestCategory(description);
    setSuggested(s);
  }, [description]);

  const selectedLabel = useMemo(() => {
    if (!selection.categoryId) return "Seleccionar";
    const labels = getLabelsFromIds(selection.categoryId, selection.subcategoryId);
    return labels.subcategoryLabel || labels.categoryLabel;
  }, [selection]);

  const handleAddExpense = async () => {
    if (!amount || !description) {
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    let finalCategoryLabel: string | null = null;
    let finalIds: { categoryId?: string; subcategoryId?: string } = {};

    if (selection.categoryId) {
      const labels = getLabelsFromIds(selection.categoryId, selection.subcategoryId);
      finalCategoryLabel = labels.subcategoryLabel || labels.categoryLabel;
      finalIds = selection;
    } else if (suggested?.categoryId) {
      const labels = getLabelsFromIds(suggested.categoryId, suggested.subcategoryId);
      finalCategoryLabel = labels.subcategoryLabel || labels.categoryLabel;
      finalIds = { categoryId: suggested.categoryId, subcategoryId: suggested.subcategoryId };
    } else {
      try {
        const aiLabel = await categorizeExpense(description);
        const top = findCategoryByLabel(aiLabel);
        if (top) {
          finalIds = { categoryId: top.id };
          const labels = getLabelsFromIds(top.id);
          finalCategoryLabel = labels.categoryLabel;
        }
      } catch {}
    }

    if (!finalCategoryLabel) {
      finalCategoryLabel = "Otros";
      finalIds = { categoryId: "otros", subcategoryId: "sin_especificar" };
    }

    addExpense({
      amount: numAmount,
      description,
      category: finalCategoryLabel,
      categoryId: finalIds.categoryId,
      subcategoryId: finalIds.subcategoryId,
      date: new Date().toISOString(),
    } as any);

    setAmount("");
    setDescription("");
    setSelection({});
    setSuggested(null);
  };



  if (showCamera) {
    return (
      <View className="flex-1 bg-black">
        <CameraView style={{ flex: 1 }} facing="back">
          <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
            <SafeAreaView className="flex-1">
              <View className="flex-row justify-between items-center p-4">
                <AnimatedPressable onPress={() => setShowCamera(false)} className="bg-black/50 rounded-full p-3">
                  <Ionicons name="close" size={24} color="white" />
                </AnimatedPressable>
                <Text className="text-white font-semibold text-lg">Escanear recibo</Text>
                <View className="w-12" />
              </View>
              <View className="flex-1 justify-center items-center">
                <View className="border-2 border-white/50 rounded-2xl w-80 h-96 items-center justify-center">
                  <Text className="text-white text-center px-4">Coloca el recibo dentro del marco</Text>
                </View>
              </View>
              <View className="p-6">
                <AnimatedPressable className="bg-blue-600 rounded-xl py-4 items-center" onPress={() => setShowCamera(false)}>
                  <Ionicons name="camera" size={24} color="white" />
                   <Text className="text-white font-semibold mt-2">Capturar recibo</Text>
                </AnimatedPressable>
              </View>
            </SafeAreaView>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="p-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Agregar nuevo gasto</Text>
            <Text className="text-gray-600">Registra tus gastos manualmente o escanea un recibo</Text>
          </View>

          {/* Quick Actions */}
          <View className="flex-row mb-8" style={{ gap: 12, flexWrap: "wrap" }}>
            <AnimatedPressable className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ width: "48%" }}>
              <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="create-outline" size={20} color="#10b981" />
              </View>
              <Text className="font-medium text-gray-900">Ingreso manual</Text>
              <Text className="text-gray-500 text-sm">Completa los datos abajo</Text>
            </AnimatedPressable>
            <AnimatedPressable className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ width: "48%" }} onPress={() => navigation.navigate("StatementUpload")}>
              <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="document-text" size={20} color="#3b82f6" />
              </View>
              <Text className="font-medium text-gray-900">Subir estado</Text>
              <Text className="text-gray-500 text-sm">Detección automática</Text>
            </AnimatedPressable>
            <AnimatedPressable className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ width: "48%" }} onPress={() => navigation.navigate("NotesBulk")}>
              <View className="bg-purple-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="pencil" size={20} color="#8b5cf6" />
              </View>
              <Text className="font-medium text-gray-900">Desde notas</Text>
              <Text className="text-gray-500 text-sm">Pegar y revisar</Text>
            </AnimatedPressable>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            {/* Amount */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Monto</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-600 text-lg font-medium mr-2">{getCurrencySymbol(currency)}</Text>
                <TextInput value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" className="flex-1 text-lg font-medium text-gray-900" />
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Descripción</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="¿En qué gastaste?" className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900" multiline numberOfLines={2} />
            </View>

            {/* Category field with suggestion */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-700 font-medium">Categoría</Text>
                {suggested?.categoryId && (
                  <AnimatedPressable className="px-3 py-1.5 rounded-full bg-blue-50" onPress={() => setSelection({ categoryId: suggested!.categoryId, subcategoryId: suggested!.subcategoryId })}>
                    <Text className="text-blue-700 text-xs font-medium">Sugerido</Text>
                  </AnimatedPressable>
                )}
              </View>
              <AnimatedPressable className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between" onPress={() => setShowPicker(true)}>
                <Text className="text-gray-900 font-medium">{selectedLabel}</Text>
                <Ionicons name="chevron-forward" size={18} color="#6b7280" />
              </AnimatedPressable>
            </View>

            {/* Date */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Fecha</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-900">{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</Text>
              </View>
            </View>
          </View>


          {/* Add Button */}
          <AnimatedPressable onPress={handleAddExpense} className="bg-blue-600 rounded-xl py-4 items-center shadow-sm">
            <Text className="text-white font-semibold text-lg">Agregar gasto</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>

      {/* Category Picker */}
      <CategoryPickerModal visible={showPicker} onClose={() => setShowPicker(false)} onSelect={(sel) => setSelection(sel)} />


    </SafeAreaView>
  );
}
