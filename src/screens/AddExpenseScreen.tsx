import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import CategoryPickerModal from "../components/CategoryPickerModal";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { useExpenseStore } from "../state/expenseStore";
import { categorizeExpense } from "../utils/aiCategorization";
import { format } from "date-fns";
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

  // Bulk notes state
  const [bulkNotes, setBulkNotes] = useState("");
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewItems, setReviewItems] = useState<Array<{ description: string; amount: string; categoryId?: string; subcategoryId?: string; suggested?: { categoryId?: string; subcategoryId?: string } }>>([]);
  const [bulkPickerVisible, setBulkPickerVisible] = useState(false);
  const [bulkPickerIndex, setBulkPickerIndex] = useState<number | null>(null);

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

  // Helpers for bulk parsing
  const toTitle = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeVendor = (raw: string) => {
    const base = toTitle(raw);
    const map: Record<string, string> = {
      uber: "Uber",
      didi: "DiDi",
      cabify: "Cabify",
      mcdonalds: "McDonalds",
      starbucks: "Starbucks",
      netflix: "Netflix",
      spotify: "Spotify",
      walmart: "Walmart",
    };
    const key = base.replace(/\s+/g, "").toLowerCase();
    for (const k of Object.keys(map)) {
      if (key.includes(k)) return map[k];
    }
    return base;
  };

  const parseNotesToItems = (text: string) => {
    const result: Array<{ description: string; amount: string; categoryId?: string; subcategoryId?: string; suggested?: { categoryId?: string; subcategoryId?: string } }> = [];
    if (!text || !text.trim()) return result;
    const pattern = /([^\d\n]+?)\s*(-?\d+(?:[\.,]\d{1,2})?)/g; // description + number
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const desc = normalizeVendor(m[1]);
      const amt = (m[2] || "").replace(",", ".");
      if (!desc || !amt) continue;
      const sugg = suggestCategory(desc);
      result.push({ description: desc, amount: amt, suggested: sugg || undefined, categoryId: sugg?.categoryId, subcategoryId: sugg?.subcategoryId });
    }
    // Fallback: try line by line if nothing matched
    if (result.length === 0) {
      const lines = text.split(/\n+/);
      for (const line of lines) {
        const mm = /([^\d]+?)\s*(-?\d+(?:[\.,]\d{1,2})?)/.exec(line);
        if (mm) {
          const desc = normalizeVendor(mm[1]);
          const amt = (mm[2] || "").replace(",", ".");
          const sugg = suggestCategory(desc);
          result.push({ description: desc, amount: amt, suggested: sugg || undefined, categoryId: sugg?.categoryId, subcategoryId: sugg?.subcategoryId });
        }
      }
    }
    return result;
  };

  const confirmBulk = () => {
    reviewItems.forEach((item) => {
      const num = parseFloat(item.amount);
      if (isNaN(num) || num <= 0) return;
      const catId = item.categoryId || item.suggested?.categoryId;
      const subId = item.subcategoryId || item.suggested?.subcategoryId;
      const labels = catId ? getLabelsFromIds(catId, subId) : { categoryLabel: "Otros", subcategoryLabel: undefined };
      const categoryLabel = labels.subcategoryLabel || labels.categoryLabel || "Otros";
      addExpense({
        amount: num,
        description: item.description,
        category: categoryLabel,
        categoryId: catId,
        subcategoryId: subId,
        date: new Date().toISOString(),
      } as any);
    });
    setReviewVisible(false);
    setBulkNotes("");
    setReviewItems([]);
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
                <Text className="text-white font-semibold text-lg">Scan Receipt</Text>
                <View className="w-12" />
              </View>
              <View className="flex-1 justify-center items-center">
                <View className="border-2 border-white/50 rounded-2xl w-80 h-96 items-center justify-center">
                  <Text className="text-white text-center px-4">Position receipt within the frame</Text>
                </View>
              </View>
              <View className="p-6">
                <AnimatedPressable className="bg-blue-600 rounded-xl py-4 items-center" onPress={() => setShowCamera(false)}>
                  <Ionicons name="camera" size={24} color="white" />
                  <Text className="text-white font-semibold mt-2">Capture Receipt</Text>
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
            <Text className="text-2xl font-bold text-gray-900 mb-2">Add New Expense</Text>
            <Text className="text-gray-600">Track your spending manually or scan a receipt</Text>
          </View>

          {/* Quick Actions */}
          <View className="flex-row space-x-4 mb-8">
            <AnimatedPressable className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <View className="bg-green-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="create-outline" size={20} color="#10b981" />
              </View>
              <Text className="font-medium text-gray-900">Manual Entry</Text>
              <Text className="text-gray-500 text-sm">Fill details below</Text>
            </AnimatedPressable>
            <AnimatedPressable className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100" onPress={() => navigation.navigate("StatementUpload")}>
              <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="document-text" size={20} color="#3b82f6" />
              </View>
              <Text className="font-medium text-gray-900">Upload Statement</Text>
              <Text className="text-gray-500 text-sm">Auto-detect</Text>
            </AnimatedPressable>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            {/* Amount */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Amount</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-600 text-lg font-medium mr-2">{getCurrencySymbol(currency)}</Text>
                <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" className="flex-1 text-lg font-medium text-gray-900" />
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="What did you spend on?" className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900" multiline numberOfLines={2} />
            </View>

            {/* Category field with suggestion */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-700 font-medium">Category</Text>
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
              <Text className="text-gray-700 font-medium mb-2">Date</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-900">{format(new Date(), "MMMM d, yyyy")}</Text>
              </View>
            </View>
          </View>

          {/* Bulk Notes Entry */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-2">Agregar desde notas</Text>
            <Text className="text-gray-600 text-sm mb-3">Ejemplo: Uber 50\nMcdonalds 40\nXXX 30</Text>
            <TextInput
              value={bulkNotes}
              onChangeText={setBulkNotes}
              placeholder="Pega tus notas aquí"
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              multiline
              numberOfLines={4}
            />
            <AnimatedPressable
              className="mt-4 bg-blue-600 rounded-xl py-3 items-center"
              onPress={() => {
                const items = parseNotesToItems(bulkNotes);
                if (items.length === 0) return;
                setReviewItems(items);
                setReviewVisible(true);
              }}
            >
              <Text className="text-white font-semibold">Agregar</Text>
            </AnimatedPressable>
          </View>

          {/* Add Button */}
          <AnimatedPressable onPress={handleAddExpense} className="bg-blue-600 rounded-xl py-4 items-center shadow-sm">
            <Text className="text-white font-semibold text-lg">Add Expense</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>

      {/* Category Picker */}
      <CategoryPickerModal visible={showPicker} onClose={() => setShowPicker(false)} onSelect={(sel) => setSelection(sel)} />

      {/* Bulk Review Modal */}
      <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={() => setReviewVisible(false)}>
        <View className="flex-1 bg-black/40 items-center justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 max-h-[80%]">
            <Text className="text-lg font-semibold text-gray-900 mb-1">Revisar gastos detectados</Text>
            <Text className="text-gray-600 mb-4">Corrige nombres, montos o categorías si es necesario</Text>
            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              {reviewItems.map((it, idx) => {
                const labels = it.categoryId ? getLabelsFromIds(it.categoryId, it.subcategoryId) : it.suggested?.categoryId ? getLabelsFromIds(it.suggested.categoryId!, it.suggested.subcategoryId) : { categoryLabel: "Otros" } as any;
                const catLabel = labels.subcategoryLabel || labels.categoryLabel || "Seleccionar";
                return (
                  <View key={idx} className="mb-4">
                    <View className="bg-gray-50 rounded-xl p-3">
                      <View className="flex-row" style={{ gap: 12 }}>
                        <View className="flex-1">
                          <Text className="text-gray-700 text-xs mb-1">Descripción</Text>
                          <TextInput value={it.description} onChangeText={(t) => {
                            const next = [...reviewItems]; next[idx] = { ...next[idx], description: t }; setReviewItems(next);
                          }} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                        </View>
                        <View style={{ width: 110 }}>
                          <Text className="text-gray-700 text-xs mb-1">Monto</Text>
                          <TextInput value={it.amount} keyboardType="decimal-pad" onChangeText={(t) => {
                            const next = [...reviewItems]; next[idx] = { ...next[idx], amount: t }; setReviewItems(next);
                          }} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                        </View>
                      </View>
                      <View className="mt-3">
                        <Text className="text-gray-700 text-xs mb-1">Categoría</Text>
                        <AnimatedPressable className="bg-white rounded-lg px-3 py-2 flex-row items-center justify-between" onPress={() => { setBulkPickerIndex(idx); setBulkPickerVisible(true); }}>
                          <Text className="text-gray-900">{catLabel}</Text>
                          <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                        </AnimatedPressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View className="flex-row" style={{ gap: 12 }}>
              <AnimatedPressable className="flex-1 py-4 rounded-2xl border border-gray-200" onPress={() => setReviewVisible(false)}>
                <Text className="text-center font-medium text-gray-700 text-base">Cancelar</Text>
              </AnimatedPressable>
              <AnimatedPressable className="flex-1 py-4 rounded-2xl bg-blue-600" onPress={confirmBulk}>
                <Text className="text-center font-medium text-white text-base">Confirmar</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Category Picker */}
      <CategoryPickerModal
        visible={bulkPickerVisible}
        onClose={() => { setBulkPickerVisible(false); setBulkPickerIndex(null); }}
        onSelect={(sel) => {
          if (bulkPickerIndex === null) return;
          const next = [...reviewItems];
          next[bulkPickerIndex] = { ...next[bulkPickerIndex], categoryId: sel.categoryId, subcategoryId: sel.subcategoryId };
          setReviewItems(next);
          setBulkPickerVisible(false);
          setBulkPickerIndex(null);
        }}
      />
    </SafeAreaView>
  );
}
