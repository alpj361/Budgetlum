import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrencySymbol } from '../../types/centralAmerica';

interface SummaryCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string | number;
    type?: 'currency' | 'text' | 'frequency';
  }>;
  onEdit?: () => void;
  country?: string;
  backgroundColor?: string;
  accentColor?: string;
}

export default function SummaryCard({
  title,
  items,
  onEdit,
  country = "GT",
  backgroundColor = "#F0FDF4",
  accentColor = "#10B981"
}: SummaryCardProps) {
  const currencySymbol = getCurrencySymbol(country);

  const formatValue = (value: string | number, type?: string) => {
    if (type === 'currency' && typeof value === 'number') {
      return `${currencySymbol}${value.toLocaleString()}`;
    }
    return value.toString();
  };

  const frequencyLabels: Record<string, string> = {
    'weekly': 'Semanal',
    'bi-weekly': 'Quincenal',
    'monthly': 'Mensual',
    'quarterly': 'Trimestral',
    'yearly': 'Anual'
  };

  const formatFrequency = (value: string) => {
    return frequencyLabels[value] || value;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={accentColor} />
            <Text style={[styles.editText, { color: accentColor }]}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemValue}>
              {item.type === 'frequency'
                ? formatFrequency(item.value.toString())
                : formatValue(item.value, item.type)
              }
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
});