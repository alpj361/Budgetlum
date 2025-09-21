import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PaymentFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';

interface FrequencySelectorProps {
  value: PaymentFrequency;
  onValueChange: (frequency: PaymentFrequency) => void;
  label?: string;
  error?: string;
}

const frequencyOptions: { value: PaymentFrequency; label: string; description: string }[] = [
  { value: 'weekly', label: 'Semanal', description: 'Cada semana' },
  { value: 'bi-weekly', label: 'Quincenal', description: 'Cada 2 semanas' },
  { value: 'monthly', label: 'Mensual', description: 'Una vez al mes' },
  { value: 'quarterly', label: 'Trimestral', description: 'Cada 3 meses' },
  { value: 'yearly', label: 'Anual', description: 'Una vez al año' },
];

export default function FrequencySelector({
  value,
  onValueChange,
  label,
  error
}: FrequencySelectorProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.optionsContainer}>
        {frequencyOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              value === option.value ? styles.selectedOption : null
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  value === option.value ? styles.selectedText : null
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  value === option.value ? styles.selectedDescription : null
                ]}>
                  {option.description}
                </Text>
              </View>

              {value === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  selectedOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  selectedText: {
    color: '#065F46',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDescription: {
    color: '#047857',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
});