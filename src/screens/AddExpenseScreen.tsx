import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { useExpenseStore } from "../state/expenseStore";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "../types/expense";
import { categorizeExpense } from "../utils/aiCategorization";
import { format } from "date-fns";
import { useSettingsStore } from "../state/settingsStore";
import { getCurrencySymbol } from "../utils/currency";

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const navigation = useNavigation<any>();
  
  const { addExpense } = useExpenseStore();
  const currency = useSettingsStore((s) => s.primaryCurrency);

  const handleAddExpense = async () => {
    if (!amount || !description) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Use AI to suggest category if user hasn't changed from default
    let finalCategory = selectedCategory;
    if (selectedCategory === EXPENSE_CATEGORIES[0]) {
      try {
        finalCategory = await categorizeExpense(description);
      } catch (error) {
        // If AI fails, keep the selected category
        console.log("AI categorization failed, using selected category");
      }
    }

    addExpense({
      amount: numAmount,
      description,
      category: finalCategory,
      date: new Date().toISOString(),
    });

    // Reset form
    setAmount("");
    setDescription("");
    setSelectedCategory(EXPENSE_CATEGORIES[0]);
    
    Alert.alert("Success", "Expense added successfully!");
  };

  const handleScanReceipt = async () => {
    if (!permission) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Camera permission is required to scan receipts");
        return;
      }
    }
    
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Camera permission is required to scan receipts");
        return;
      }
    }

    setShowCamera(true);
  };

  if (showCamera) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
        >
          <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
            <SafeAreaView className="flex-1">
              <View className="flex-row justify-between items-center p-4">
                <AnimatedPressable
                  onPress={() => setShowCamera(false)}
                  className="bg-black/50 rounded-full p-3"
                >
                  <Ionicons name="close" size={24} color="white" />
                </AnimatedPressable>
                <Text className="text-white font-semibold text-lg">
                  Scan Receipt
                </Text>
                <View className="w-12" />
              </View>
              
              <View className="flex-1 justify-center items-center">
                <View className="border-2 border-white/50 rounded-2xl w-80 h-96 items-center justify-center">
                  <Text className="text-white text-center px-4">
                    Position receipt within the frame
                  </Text>
                </View>
              </View>
              
              <View className="p-6">
                <AnimatedPressable
                  className="bg-blue-600 rounded-xl py-4 items-center"
                  onPress={() => {
                    // TODO: Implement receipt scanning with AI
                    setShowCamera(false);
                    Alert.alert("Coming Soon", "Receipt scanning will be implemented next!");
                  }}
                >
                  <Ionicons name="camera" size={24} color="white" />
                  <Text className="text-white font-semibold mt-2">
                    Capture Receipt
                  </Text>
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
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Add New Expense
            </Text>
            <Text className="text-gray-600">
              Track your spending manually or scan a receipt
            </Text>
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
            
            <AnimatedPressable 
              className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              onPress={() => navigation.navigate("StatementUpload")}
            >
              <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mb-3">
                <Ionicons name="document-text" size={20} color="#3b82f6" />
              </View>
              <Text className="font-medium text-gray-900">Upload Statement</Text>
              <Text className="text-gray-500 text-sm">Auto-detect</Text>
            </AnimatedPressable>
          </View>

          {/* Form */}
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            {/* Amount */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Amount</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-600 text-lg font-medium mr-2">{getCurrencySymbol(currency)}</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="flex-1 text-lg font-medium text-gray-900"
                />
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What did you spend on?"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Category */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-3">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-3">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <Pressable
                      key={category}
                      onPress={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full border ${
                        selectedCategory === category
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          selectedCategory === category
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Date */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Date</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-gray-900">
                  {format(new Date(), "MMMM d, yyyy")}
                </Text>
              </View>
            </View>
          </View>

          {/* Add Button */}
          <AnimatedPressable
            onPress={handleAddExpense}
            className="bg-blue-600 rounded-xl py-4 items-center shadow-sm"
          >
            <Text className="text-white font-semibold text-lg">
              Add Expense
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}