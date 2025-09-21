import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CurrencyInput from './CurrencyInput';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface ExpenseItem {
  id: string;
  categoryId: string;
  amount: number;
  isRecurring: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
  customName?: string;
}

interface ExpenseInputProps {
  categories: ExpenseCategory[];
  expenses: ExpenseItem[];
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onUpdateExpense: (id: string, expense: Partial<ExpenseItem>) => void;
  onRemoveExpense: (id: string) => void;
  country?: string;
}

const defaultCategories: ExpenseCategory[] = [
  { id: 'housing', name: 'Vivienda', icon: 'home-outline', color: '#3B82F6' },
  { id: 'food', name: 'Alimentación', icon: 'restaurant-outline', color: '#10B981' },
  { id: 'transportation', name: 'Transporte', icon: 'car-outline', color: '#F59E0B' },
  { id: 'utilities', name: 'Servicios', icon: 'flash-outline', color: '#8B5CF6' },
  { id: 'healthcare', name: 'Salud', icon: 'medical-outline', color: '#EF4444' },
  { id: 'entertainment', name: 'Entretenimiento', icon: 'game-controller-outline', color: '#F97316' },
  { id: 'clothing', name: 'Ropa', icon: 'shirt-outline', color: '#EC4899' },
  { id: 'education', name: 'Educación', icon: 'school-outline', color: '#06B6D4' },
  { id: 'family', name: 'Familia', icon: 'people-outline', color: '#84CC16' },
  { id: 'savings', name: 'Ahorros', icon: 'wallet-outline', color: '#6366F1' },
];

export default function ExpenseInput({
  categories = defaultCategories,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  country = "GT"
}: ExpenseInputProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [isRecurring, setIsRecurring] = useState(true);

  const handleAddExpense = () => {
    if (selectedCategory && amount > 0) {
      onAddExpense({
        categoryId: selectedCategory,
        amount,
        isRecurring,
        frequency: isRecurring ? 'monthly' : undefined
      });

      // Reset form
      setSelectedCategory(null);
      setAmount(0);
      setIsRecurring(true);
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find(cat => cat.id === id);
  };

  const getExpensesByCategory = (categoryId: string) => {
    return expenses.filter(expense => expense.categoryId === categoryId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Selecciona una categoría</Text>

      {/* Category Grid */}
      <View style={styles.categoriesGrid}>
        {categories.map((category) => {
          const categoryExpenses = getExpensesByCategory(category.id);
          const totalAmount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);

          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id ? styles.selectedCategory : null,
                { borderColor: category.color }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon as any} size={24} color={category.color} />
              </View>

              <Text style={styles.categoryName}>{category.name}</Text>

              {totalAmount > 0 && (
                <Text style={styles.categoryAmount}>
                  ${totalAmount.toLocaleString()}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount Input */}
      {selectedCategory && (
        <View style={styles.inputSection}>
          <CurrencyInput
            value={amount}
            onValueChange={setAmount}
            label={`Monto para ${getCategoryById(selectedCategory)?.name}`}
            country={country}
          />

          {/* Recurring Toggle */}
          <View style={styles.recurringSection}>
            <View style={styles.recurringToggle}>
              <Text style={styles.recurringLabel}>Gasto recurrente (mensual)</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={isRecurring ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.recurringDescription}>
              {isRecurring
                ? 'Se repetirá cada mes en tu presupuesto'
                : 'Gasto único o irregular'
              }
            </Text>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              amount <= 0 ? styles.disabledButton : null
            ]}
            onPress={handleAddExpense}
            disabled={amount <= 0}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={styles.addButtonText}>Agregar Gasto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Expenses List */}
      {expenses.length > 0 && (
        <View style={styles.expensesList}>
          <Text style={styles.expensesTitle}>Gastos agregados</Text>
          {expenses.map((expense) => {
            const category = getCategoryById(expense.categoryId);
            return (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseInfo}>
                  <View style={[styles.expenseIcon, { backgroundColor: category?.color + '20' }]}>
                    <Ionicons name={category?.icon as any} size={16} color={category?.color} />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseCategory}>{category?.name}</Text>
                    <Text style={styles.expenseFrequency}>
                      {expense.isRecurring ? 'Mensual' : 'Único'}
                    </Text>
                  </View>
                </View>

                <View style={styles.expenseActions}>
                  <Text style={styles.expenseAmount}>
                    ${expense.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onRemoveExpense(expense.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '30%',
    minWidth: 100,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  selectedCategory: {
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  categoryAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  inputSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recurringSection: {
    marginBottom: 16,
  },
  recurringToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  recurringDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  expensesList: {
    gap: 8,
  },
  expensesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  expenseItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  expenseFrequency: {
    fontSize: 12,
    color: '#6B7280',
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
});