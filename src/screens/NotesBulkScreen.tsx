import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "../components/AnimatedPressable";
import CategoryPickerModal from "../components/CategoryPickerModal";
import { useExpenseStore } from "../state/expenseStore";
import { getLabelsFromIds } from "../types/categories";
import { suggestCategory } from "../utils/category/heuristics";

export default function NotesBulkScreen() {
  const { addExpense } = useExpenseStore();
  const [notes, setNotes] = useState("");
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewItems, setReviewItems] = useState<Array<{ description: string; amount: string; categoryId?: string; subcategoryId?: string; suggested?: { categoryId?: string; subcategoryId?: string } }>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

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

  const parseNotes = (text: string) => {
    const result: Array<{ description: string; amount: string; categoryId?: string; subcategoryId?: string; suggested?: { categoryId?: string; subcategoryId?: string } }> = [];
    if (!text || !text.trim()) return result;
    const pattern = /([^\d\n]+?)\s*(-?\d+(?:[\.,]\d{1,2})?)/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const desc = normalizeVendor(m[1]);
      const amt = (m[2] || "").replace(",", ".");
      if (!desc || !amt) continue;
      const sugg = suggestCategory(desc);
      result.push({ description: desc, amount: amt, suggested: sugg || undefined, categoryId: sugg?.categoryId, subcategoryId: sugg?.subcategoryId });
    }
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

  const startReview = () => {
    const items = parseNotes(notes);
    if (items.length === 0) return;
    setReviewItems(items);
    setReviewVisible(true);
  };

  const confirm = () => {
    reviewItems.forEach((item) => {
      const num = parseFloat(item.amount);
      if (isNaN(num) || num <= 0) return;
      const catId = item.categoryId || item.suggested?.categoryId;
      const subId = item.subcategoryId || item.suggested?.subcategoryId;
      const labels = catId ? getLabelsFromIds(catId, subId) : { categoryLabel: "Otros", subcategoryLabel: undefined } as any;
      const categoryLabel = labels.subcategoryLabel || labels.categoryLabel || "Otros";
      addExpense({ amount: num, description: item.description, category: categoryLabel, categoryId: catId, subcategoryId: subId, date: new Date().toISOString() } as any);
    });
    setReviewVisible(false);
    setNotes("");
    setReviewItems([]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="p-6">
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Add From Notes</Text>
            <Text className="text-gray-600">Pega tus notas con formato: Vendor Monto en líneas separadas</Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <Text className="text-gray-900 font-semibold text-base mb-2">Notas</Text>
            <Text className="text-gray-600 text-sm mb-3">Ejemplo: Uber 50\nMcdonalds 40\nXXX 30</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Pega tus notas aquí" className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900" multiline numberOfLines={8} />
            <AnimatedPressable className="mt-4 bg-blue-600 rounded-xl py-4 items-center" onPress={startReview}>
              <Text className="text-white font-semibold text-base">Continuar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </ScrollView>

      {/* Review Modal */}
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
                          <TextInput value={it.description} onChangeText={(t) => { const next = [...reviewItems]; next[idx] = { ...next[idx], description: t }; setReviewItems(next); }} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                        </View>
                        <View style={{ width: 110 }}>
                          <Text className="text-gray-700 text-xs mb-1">Monto</Text>
                          <TextInput value={it.amount} keyboardType="decimal-pad" onChangeText={(t) => { const next = [...reviewItems]; next[idx] = { ...next[idx], amount: t }; setReviewItems(next); }} className="bg-white rounded-lg px-3 py-2 text-gray-900" />
                        </View>
                      </View>
                      <View className="mt-3">
                        <Text className="text-gray-700 text-xs mb-1">Categoría</Text>
                        <AnimatedPressable className="bg-white rounded-lg px-3 py-2 flex-row items-center justify-between" onPress={() => { setPickerIndex(idx); setPickerVisible(true); }}>
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
              <AnimatedPressable className="flex-1 py-4 rounded-2xl bg-blue-600" onPress={confirm}>
                <Text className="text-center font-medium text-white text-base">Confirmar</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker */}
      <CategoryPickerModal
        visible={pickerVisible}
        onClose={() => { setPickerVisible(false); setPickerIndex(null); }}
        onSelect={(sel) => {
          if (pickerIndex === null) return;
          const next = [...reviewItems];
          next[pickerIndex] = { ...next[pickerIndex], categoryId: sel.categoryId, subcategoryId: sel.subcategoryId };
          setReviewItems(next);
          setPickerVisible(false);
          setPickerIndex(null);
        }}
      />
    </SafeAreaView>
  );
}
