import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CurrencyInput from './CurrencyInput';

export interface DebtItem {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate: number;
  dueDate: Date;
  type: 'credit_card' | 'loan' | 'mortgage' | 'personal' | 'other';
  priority: number; // Auto-calculated based on interest rate and amount
}

interface DebtInputProps {
  debts: DebtItem[];
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'priority'>) => void;
  onUpdateDebt: (id: string, debt: Partial<DebtItem>) => void;
  onRemoveDebt: (id: string) => void;
  country?: string;
}

const debtTypes = [
  { value: 'credit_card', label: 'Tarjeta de Crédito', icon: 'card-outline', color: '#EF4444' },
  { value: 'loan', label: 'Préstamo Personal', icon: 'cash-outline', color: '#F59E0B' },
  { value: 'mortgage', label: 'Hipoteca', icon: 'home-outline', color: '#3B82F6' },
  { value: 'personal', label: 'Deuda Personal', icon: 'person-outline', color: '#8B5CF6' },
  { value: 'other', label: 'Otro', icon: 'document-outline', color: '#6B7280' },
];

export default function DebtInput({
  debts,
  onAddDebt,
  onUpdateDebt,
  onRemoveDebt,
  country = "GT"
}: DebtInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    dueDate: new Date(),
    type: 'credit_card' as DebtItem['type']
  });

  const resetForm = () => {
    setFormData({
      name: '',
      totalAmount: 0,
      monthlyPayment: 0,
      interestRate: 0,
      dueDate: new Date(),
      type: 'credit_card'
    });
    setIsAdding(false);
  };

  const handleAddDebt = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la deuda');
      return;
    }

    if (formData.totalAmount <= 0) {
      Alert.alert('Error', 'El monto total debe ser mayor a 0');
      return;
    }

    if (formData.monthlyPayment <= 0) {
      Alert.alert('Error', 'El pago mensual debe ser mayor a 0');
      return;
    }

    onAddDebt(formData);
    resetForm();
  };

  const calculateMonthsToPayOff = (totalAmount: number, monthlyPayment: number, interestRate: number) => {
    if (interestRate === 0) {
      return Math.ceil(totalAmount / monthlyPayment);
    }

    const monthlyRate = interestRate / 100 / 12;
    const months = Math.log(1 + (totalAmount * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  };

  const getDebtTypeInfo = (type: string) => {
    return debtTypes.find(dt => dt.value === type) || debtTypes[0];
  };

  const getPriorityText = (interestRate: number) => {
    if (interestRate >= 20) return { text: 'Prioridad Alta', color: '#EF4444' };
    if (interestRate >= 10) return { text: 'Prioridad Media', color: '#F59E0B' };
    return { text: 'Prioridad Baja', color: '#10B981' };
  };

  return (
    <View style={styles.container}>
      {/* Add New Debt Button */}
      {!isAdding && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAdding(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.addButtonText}>Agregar Deuda</Text>
        </TouchableOpacity>
      )}

      {/* Add Debt Form */}
      {isAdding && (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nueva Deuda</Text>
            <TouchableOpacity onPress={resetForm}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Debt Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de la deuda</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Ej: Tarjeta Visa, Préstamo Auto"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Debt Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de deuda</Text>
            <View style={styles.typeSelector}>
              {debtTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    formData.type === type.value ? styles.selectedType : null,
                    { borderColor: type.color }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.value as DebtItem['type'] }))}
                >
                  <Ionicons name={type.icon as any} size={20} color={type.color} />
                  <Text style={styles.typeLabel}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Total Amount */}
          <CurrencyInput
            value={formData.totalAmount}
            onValueChange={(value) => setFormData(prev => ({ ...prev, totalAmount: value }))}
            label="Monto total de la deuda"
            country={country}
          />

          {/* Monthly Payment */}
          <CurrencyInput
            value={formData.monthlyPayment}
            onValueChange={(value) => setFormData(prev => ({ ...prev, monthlyPayment: value }))}
            label="Pago mensual"
            country={country}
          />

          {/* Interest Rate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tasa de interés anual (%)</Text>
            <View style={styles.percentInput}>
              <TextInput
                style={styles.numberInput}
                value={formData.interestRate > 0 ? formData.interestRate.toString() : ''}
                onChangeText={(text) => {
                  const rate = parseFloat(text) || 0;
                  setFormData(prev => ({ ...prev, interestRate: rate }));
                }}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <Text style={styles.percentSymbol}>%</Text>
            </View>
          </View>

          {/* Payment Calculation */}
          {formData.totalAmount > 0 && formData.monthlyPayment > 0 && (
            <View style={styles.calculationBox}>
              <Text style={styles.calculationTitle}>Información de pagos</Text>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Tiempo estimado:</Text>
                <Text style={styles.calculationValue}>
                  {calculateMonthsToPayOff(formData.totalAmount, formData.monthlyPayment, formData.interestRate)} meses
                </Text>
              </View>
              {formData.interestRate > 0 && (
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Prioridad:</Text>
                  <Text style={[
                    styles.priorityText,
                    { color: getPriorityText(formData.interestRate).color }
                  ]}>
                    {getPriorityText(formData.interestRate).text}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Form Actions */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddDebt}
            >
              <Text style={styles.saveButtonText}>Guardar Deuda</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Existing Debts List */}
      {debts.length > 0 && (
        <View style={styles.debtsList}>
          <Text style={styles.debtsTitle}>Deudas registradas</Text>
          {debts
            .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0)) // Sort by interest rate (highest first)
            .map((debt) => {
              const typeInfo = getDebtTypeInfo(debt.type);
              const priority = getPriorityText(debt.interestRate);
              const monthsLeft = calculateMonthsToPayOff(debt.totalAmount, debt.monthlyPayment, debt.interestRate);

              return (
                <View key={debt.id} style={styles.debtCard}>
                  <View style={styles.debtHeader}>
                    <View style={styles.debtInfo}>
                      <View style={[styles.debtIcon, { backgroundColor: typeInfo.color + '20' }]}>
                        <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                      </View>
                      <View style={styles.debtDetails}>
                        <Text style={styles.debtName}>{debt.name}</Text>
                        <Text style={styles.debtType}>{typeInfo.label}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemoveDebt(debt.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.debtMetrics}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Monto total</Text>
                      <Text style={styles.metricValue}>${debt.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Pago mensual</Text>
                      <Text style={styles.metricValue}>${debt.monthlyPayment.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Interés</Text>
                      <Text style={styles.metricValue}>{debt.interestRate}%</Text>
                    </View>
                  </View>

                  <View style={styles.debtFooter}>
                    <Text style={[styles.priorityBadge, { color: priority.color }]}>
                      {priority.text}
                    </Text>
                    <Text style={styles.timeLeft}>
                      {monthsLeft} meses restantes
                    </Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  selectedType: {
    backgroundColor: '#F0FDF4',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  percentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  numberInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  calculationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  debtsList: {
    gap: 12,
  },
  debtsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  debtCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtDetails: {
    flex: 1,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  debtType: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    padding: 4,
  },
  debtMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  debtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeLeft: {
    fontSize: 12,
    color: '#6B7280',
  },
});