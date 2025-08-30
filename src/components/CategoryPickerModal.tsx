import React, { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, ScrollView, Pressable, Dimensions } from "react-native";
import { CATEGORIES, CategoryDef, getLabelsFromIds } from "../types/categories";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "./AnimatedPressable";

export interface CategorySelection {
  categoryId: string;
  subcategoryId?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (sel: CategorySelection) => void;
  recent?: CategorySelection[];
}

export default function CategoryPickerModal({ visible, onClose, onSelect, recent = [] }: Props) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(CATEGORIES[0]?.id ?? null);

  const filteredCats = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      subs: cat.subs.filter((s) => s.label.toLowerCase().includes(q))
    })).filter((cat) => cat.label.toLowerCase().includes(q) || cat.subs.length > 0);
  }, [query]);

  const handleSelect = (catId: string, subId?: string) => {
    onSelect({ categoryId: catId, subcategoryId: subId });
    onClose();
  };

  const renderSection = (cat: CategoryDef) => (
    <View key={cat.id} className="mb-4">
      <Pressable onPress={() => setActiveCat(activeCat === cat.id ? null : cat.id)} className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">{cat.label}</Text>
        <Ionicons name={activeCat === cat.id ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
      </Pressable>
      {(activeCat === cat.id || query) && (
        <View className="px-2">
          <AnimatedPressable onPress={() => handleSelect(cat.id)} className="px-4 py-3 rounded-xl border border-gray-200 bg-white mb-2">
            <Text className="text-gray-800">Sin subcategoría</Text>
          </AnimatedPressable>
          {cat.subs.map((sub) => (
            <AnimatedPressable key={sub.id} onPress={() => handleSelect(cat.id, sub.id)} className="px-4 py-3 rounded-xl border border-gray-200 bg-white mb-2">
              <Text className="text-gray-800">{sub.label}</Text>
            </AnimatedPressable>
          ))}
        </View>
      )}
    </View>
  );

  const panelHeight = Math.min(Dimensions.get("window").height * 0.8, 640);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40">
        <View className="mt-auto bg-white rounded-t-3xl p-4" style={{ height: panelHeight }}>
          {/* Header */}
          <View className="flex-row items-center mb-3">
            <AnimatedPressable onPress={onClose} className="w-10 h-10 rounded-full items-center justify-center bg-gray-100">
              <Ionicons name="close" size={20} color="#111827" />
            </AnimatedPressable>
            <Text className="ml-3 text-lg font-semibold text-gray-900">Seleccionar categoría</Text>
          </View>

          {/* Search */}
          <View className="mb-3">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Ionicons name="search" size={16} color="#6b7280" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar..."
                className="flex-1 ml-2 text-gray-900"
              />
            </View>
          </View>

          {/* Recent */}
          {recent.length > 0 && !query && (
            <View className="mb-3">
              <Text className="text-xs text-gray-500 px-2 mb-2">Recientes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
                <View className="flex-row space-x-2">
                  {recent.map((r, idx) => {
                    const labels = getLabelsFromIds(r.categoryId, r.subcategoryId);
                    return (
                      <AnimatedPressable key={idx} onPress={() => handleSelect(r.categoryId, r.subcategoryId)} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white">
                        <Text className="text-gray-700 text-sm">{labels.subcategoryLabel || labels.categoryLabel}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* List */}
          <ScrollView>
            {filteredCats.map(renderSection)}
            <View className="h-4" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
