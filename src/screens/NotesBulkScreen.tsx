import React, { useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AnimatedPressable from "../components/AnimatedPressable";
import { suggestCategory } from "../utils/category/heuristics";

type RootStackParamList = {
  ReviewExpenses: {
    parsedExpenses: Array<{
      description: string;
      amount: number;
      category?: string;
      categoryId?: string;
      subcategoryId?: string;
    }>;
  };
};

type NotesBulkNavigationProp = StackNavigationProp<RootStackParamList>;

export default function NotesBulkScreen() {
  const navigation = useNavigation<NotesBulkNavigationProp>();
  const [notes, setNotes] = useState("");

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
    const result: Array<{ description: string; amount: number; categoryId?: string; subcategoryId?: string }> = [];
    if (!text || !text.trim()) return result;
    
    const pattern = /([^\d\n]+?)\s*(-?\d+(?:[\.,]\d{1,2})?)/g;
    let m: RegExpExecArray | null;
    
    while ((m = pattern.exec(text)) !== null) {
      const desc = normalizeVendor(m[1]);
      const amtStr = (m[2] || "").replace(",", ".");
      const amt = parseFloat(amtStr);
      
      if (!desc || isNaN(amt) || amt <= 0) continue;
      
      const sugg = suggestCategory(desc);
      result.push({ 
        description: desc, 
        amount: amt, 
        categoryId: sugg?.categoryId, 
        subcategoryId: sugg?.subcategoryId 
      });
    }
    
    if (result.length === 0) {
      const lines = text.split(/\n+/);
      for (const line of lines) {
        const mm = /([^\d]+?)\s*(-?\d+(?:[\.,]\d{1,2})?)/.exec(line);
        if (mm) {
          const desc = normalizeVendor(mm[1]);
          const amtStr = (mm[2] || "").replace(",", ".");
          const amt = parseFloat(amtStr);
          
          if (desc && !isNaN(amt) && amt > 0) {
            const sugg = suggestCategory(desc);
            result.push({ 
              description: desc, 
              amount: amt, 
              categoryId: sugg?.categoryId, 
              subcategoryId: sugg?.subcategoryId 
            });
          }
        }
      }
    }
    
    return result;
  };

  const startReview = () => {
    const parsedExpenses = parseNotes(notes);
    if (parsedExpenses.length === 0) return;
    
    navigation.navigate("ReviewExpenses", { parsedExpenses });
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
    </SafeAreaView>
  );
}
