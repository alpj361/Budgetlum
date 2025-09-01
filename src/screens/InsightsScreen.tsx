import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExpenseStore } from "../state/expenseStore";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useSettingsStore } from "../state/settingsStore";
import { formatCurrency } from "../utils/currency";
import { es } from "date-fns/locale";
import { findCategoryByLabel, getLabelsFromIds } from "../types/categories";
import CategoryRingCard from "../components/CategoryRingCard";


export default function InsightsScreen() {
  const { expenses, getTotalSpent, getCategoryInsights } = useExpenseStore();
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  const totalSpent = getTotalSpent();
  const categoryInsights = getCategoryInsights();
  
  // Cálculo de gasto diario del mes actual
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const dailySpending = daysInMonth.map(day => {
    const daySpending = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.toDateString() === day.toDateString();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      date: day,
      amount: daySpending,
    };
  });

  const maxDailySpending = Math.max(...dailySpending.map(d => d.amount), 1);
  const avgDailySpending = totalSpent / daysInMonth.length;

  // Desglose por subcategorías (mes actual)
  const subcategoryBreakdowns = useMemo(() => {
    const isInCurrentMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const map: Record<string, Array<{ subId: string; label: string; total: number; percentage: number }>> = {};
    categoryInsights.forEach((ci) => {
      const cat = findCategoryByLabel(ci.category);
      if (!cat) return;
      const totalCat = ci.totalSpent || 1;
      const bySub: Record<string, number> = {};
      expenses.forEach((e) => {
        if (!isInCurrentMonth(e.date)) return;
        const matches = (e.categoryId && e.categoryId === cat.id) || (!e.categoryId && e.category === ci.category);
        if (!matches) return;
        const id = e.subcategoryId || "sin_especificar";
        bySub[id] = (bySub[id] || 0) + e.amount;
      });
      const entries = Object.entries(bySub)
        .map(([subId, total]) => {
          const labels = getLabelsFromIds(cat.id, subId);
          return { subId, label: labels.subcategoryLabel || "Sin especificar", total, percentage: (total / totalCat) * 100 };
        })
        .sort((a, b) => b.total - a.total);
      map[cat.id] = entries;
    });
    return map;
  }, [categoryInsights, expenses]);

  const categoryIcon = (catId?: string): keyof typeof Ionicons.glyphMap => {
    switch (catId) {
      case "vivienda": return "home-outline";
      case "transporte": return "car-outline";
      case "alimentacion": return "fast-food-outline";
      case "salud": return "medkit-outline";
      case "educacion": return "school-outline";
      case "entretenimiento": return "film-outline";
      case "compras": return "cart-outline";
      case "finanzas": return "cash-outline";
      case "viajes": return "airplane-outline";
      case "servicios": return "cog-outline";
      case "ingresos": return "trending-up-outline";
      default: return "ellipse-outline";
    }
  };

  const toggleCategory = (catId: string) => setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Encabezado */}
        <View className="px-6 pt-2 pb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Análisis de gastos
          </Text>
          <Text className="text-gray-600 text-base">
            Comprende tus patrones de consumo
          </Text>
        </View>

        {/* Tarjetas de resumen */}
        <View className="px-6 mb-8">
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="bg-blue-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalSpent, currency)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">Total gastado</Text>
            </View>
            
            <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="bg-green-100 rounded-full w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={20} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(avgDailySpending, currency)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">Promedio diario</Text>
            </View>
          </View>
        </View>

        {/* Resumen por categoría */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">Resumen por categoría</Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {categoryInsights.map((c, idx) => {
                const cat = findCategoryByLabel(c.category);
                const icon = categoryIcon(cat?.id);
                return (
                  <View key={`${c.category}_${idx}`} style={{ width: "48%" }}>
                    <CategoryRingCard
                      name={c.category}
                      amount={c.totalSpent}
                      percentage={c.percentage}
                      color={c.color}
                      iconName={icon}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Gasto por categoría */}
        {categoryInsights.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Gasto por categoría
            </Text>
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              {categoryInsights.map((insight, index) => {
                const cat = findCategoryByLabel(insight.category);
                const catId = cat?.id || insight.category;
                const subs = cat ? (subcategoryBreakdowns[cat.id] || []) : [];
                return (
                  <View key={insight.category} className={`${index < categoryInsights.length - 1 ? "mb-5" : ""}`}>
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <View 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: insight.color }}
                        />
                        <Ionicons name={categoryIcon(cat?.id)} size={18} color="#6b7280" />
                        <Text className="font-medium text-gray-900 text-base ml-2">
                          {insight.category}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-semibold text-gray-900 text-base">
                          {formatCurrency(insight.totalSpent, currency)}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-0.5">
                          {insight.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <View className="bg-gray-100 rounded-full h-2 mb-2">
                      <View 
                        className="rounded-full h-2"
                        style={{ 
                          width: `${insight.percentage}%`,
                          backgroundColor: insight.color 
                        }}
                      />
                    </View>
                    {subs.length > 0 && (
                      <View className="mb-2">
                        <Text className="text-gray-600 text-sm mb-2">Subcategorías</Text>
                        {subs.map((s, si) => (
                          <View key={`${catId}_${s.subId}_${si}`} className={`${si < subs.length - 1 ? "mb-3" : ""}`}>
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-gray-800 text-sm">{s.label}</Text>
                              <Text className="text-gray-600 text-sm">{s.percentage.toFixed(1)}%</Text>
                            </View>
                            <View className="bg-gray-100 rounded-full h-1.5">
                              <View 
                                className="rounded-full h-1.5"
                                style={{ width: `${s.percentage}%`, backgroundColor: insight.color }}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Gasto diario de este mes */}
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Gasto diario de este mes
          </Text>
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, paddingLeft: 4 }}>
              <View className="flex-row items-end space-x-1">
                {dailySpending.map((day, index) => {
                  const height = Math.max((day.amount / maxDailySpending) * 90, 4);
                  const isToday = day.date.toDateString() === now.toDateString();
                  
                  return (
                    <View key={index} className="items-center">
                      <View
                        className={`rounded-t ${day.amount > 0 ? "bg-blue-500" : "bg-gray-200"} ${isToday ? "bg-blue-600" : ""}`}
                        style={{ 
                          height: height,
                          width: 10,
                          marginBottom: 6
                        }}
                      />
                      <Text className="text-xs text-gray-500 transform -rotate-45 origin-center">
                        {format(day.date, "d", { locale: es })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-gray-500 text-sm text-center">
                Toca y arrastra para ver montos diarios
              </Text>
            </View>
          </View>
        </View>

        {/* Tendencias de gasto */}
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Tendencias de gasto
          </Text>
          <View style={{ gap: 12 }}>
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-green-100 rounded-full w-11 h-11 items-center justify-center mr-4">
                    <Ionicons name="trending-down-outline" size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900 text-base">Mejor día</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">Menor gasto</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900 text-base">
                    {formatCurrency(Math.min(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {format(dailySpending.find(d => d.amount === Math.min(...dailySpending.map(d => d.amount)))?.date || now, "d 'de' MMM", { locale: es })}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-red-100 rounded-full w-11 h-11 items-center justify-center mr-4">
                    <Ionicons name="trending-up-outline" size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900 text-base">Día más alto</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">Mayor gasto</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900 text-base">
                    {formatCurrency(Math.max(...dailySpending.map(d => d.amount)), currency)}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {format(dailySpending.find(d => d.amount === Math.max(...dailySpending.map(d => d.amount)))?.date || now, "d 'de' MMM", { locale: es })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Estado vacío */}
        {expenses.length === 0 && (
          <View className="px-6 py-12 items-center">
            <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
              <Ionicons name="analytics-outline" size={32} color="#6b7280" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Aún no hay análisis
            </Text>
            <Text className="text-gray-500 text-center">
              Agrega algunos gastos para ver análisis y patrones de consumo
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}