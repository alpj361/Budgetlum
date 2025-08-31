import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";
import { Expense } from "../types/expense";
import { useExpenseStore } from "../state/expenseStore";
import CategoryPickerModal, { CategorySelection } from "../components/CategoryPickerModal";
import { getLabelsFromIds } from "../types/categories";
import AnimatedPressable from "../components/AnimatedPressable";

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

type ReviewExpensesRouteProp = RouteProp<RootStackParamList, "ReviewExpenses">;
type ReviewExpensesNavigationProp = StackNavigationProp<RootStackParamList>;

interface EditableExpense {
  id: string;
  description: string;
  amount: string;
  categoryId?: string;
  subcategoryId?: string;
  category: string;
}

export default function ReviewExpensesScreen() {
  const navigation = useNavigation<ReviewExpensesNavigationProp>();
  const route = useRoute<ReviewExpensesRouteProp>();
  const insets = useSafeAreaInsets();
  const { addExpense } = useExpenseStore();
  
  const [expenses, setExpenses] = useState<EditableExpense[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    const parsedExpenses = route.params?.parsedExpenses || [];
    const editableExpenses: EditableExpense[] = parsedExpenses.map((expense, index) => ({
      id: `temp-${index}`,
      description: expense.description,
      amount: expense.amount.toString(),
      categoryId: expense.categoryId,
      subcategoryId: expense.subcategoryId,
      category: expense.category || "Sin categoría"
    }));
    setExpenses(editableExpenses);
  }, [route.params]);

  const updateExpense = (id: string, field: keyof EditableExpense, value: string) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
  };

  const removeExpense = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  };

  const handleCategorySelect = (selection: CategorySelection) => {
    if (!editingExpenseId) return;
    
    const labels = getLabelsFromIds(selection.categoryId, selection.subcategoryId);
    const categoryLabel = labels.subcategoryLabel || labels.categoryLabel || "Sin categoría";
    
    setExpenses(prev => prev.map(expense => 
      expense.id === editingExpenseId 
        ? { 
            ...expense, 
            categoryId: selection.categoryId,
            subcategoryId: selection.subcategoryId,
            category: categoryLabel
          } 
        : expense
    ));
    
    setEditingExpenseId(null);
    setCategoryModalVisible(false);
  };

  const openCategoryPicker = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setCategoryModalVisible(true);
  };

  const handleConfirm = () => {
    const validExpenses = expenses.filter(expense => 
      expense.description.trim() && 
      parseFloat(expense.amount) > 0
    );

    if (validExpenses.length === 0) {
      Alert.alert("Error", "Agrega al menos un gasto válido");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    
    validExpenses.forEach(expense => {
      const newExpense: Expense = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        description: expense.description.trim(),
        amount: parseFloat(expense.amount),
        category: expense.category,
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId,
        date: today
      };
      addExpense(newExpense);
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate("Dashboard" as never);
  };

  const renderExpenseItem = (expense: EditableExpense, index: number) => (
    <View key={expense.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-gray-900">Gasto {index + 1}</Text>
        <AnimatedPressable 
          onPress={() => removeExpense(expense.id)}
          className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </AnimatedPressable>
      </View>

      {/* Description */}
      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-2">Descripción</Text>
        <TextInput
          value={expense.description}
          onChangeText={(text) => updateExpense(expense.id, "description", text)}
          placeholder="Ej: Almuerzo en restaurante"
          className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
        />
      </View>

      {/* Amount */}
      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-2">Monto</Text>
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
          <Text className="text-gray-600 mr-2">$</Text>
          <TextInput
            value={expense.amount}
            onChangeText={(text) => updateExpense(expense.id, "amount", text)}
            placeholder="0.00"
            keyboardType="numeric"
            className="flex-1 text-gray-900"
          />
        </View>
      </View>

      {/* Category */}
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Categoría</Text>
        <AnimatedPressable 
          onPress={() => openCategoryPicker(expense.id)}
          className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
        >
          <Text className="text-gray-900">{expense.category}</Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </AnimatedPressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <AnimatedPressable 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </AnimatedPressable>
          <Text className="text-lg font-semibold text-gray-900">Revisar gastos</Text>
          <View className="w-10" />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 py-4">
        <Text className="text-sm text-gray-600 mb-4">
          Revisa y edita los gastos antes de guardarlos. Puedes modificar la descripción, monto y categoría de cada uno.
        </Text>

        {expenses.map((expense, index) => renderExpenseItem(expense, index))}

        {expenses.length === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 text-center mt-4">
              No hay gastos para revisar
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      {expenses.length > 0 && (
        <View className="px-4 pb-4 bg-white border-t border-gray-100" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="flex-row space-x-3">
            <AnimatedPressable 
              onPress={() => navigation.goBack()}
              className="flex-1 bg-gray-100 rounded-2xl py-4 items-center"
            >
              <Text className="text-gray-700 font-semibold">Cancelar</Text>
            </AnimatedPressable>
            
            <AnimatedPressable 
              onPress={handleConfirm}
              className="flex-1 bg-blue-500 rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-semibold">
                Guardar {expenses.length} gasto{expenses.length !== 1 ? "s" : ""}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      <CategoryPickerModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingExpenseId(null);
        }}
        onSelect={handleCategorySelect}
      />
    </SafeAreaView>
  );
}