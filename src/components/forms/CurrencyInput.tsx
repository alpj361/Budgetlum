import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { getCurrencySymbol } from '../../types/centralAmerica';

interface CurrencyInputProps {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  country?: string;
  error?: string;
  disabled?: boolean;
}

export default function CurrencyInput({
  value,
  onValueChange,
  placeholder = "0.00",
  label,
  country = "GT",
  error,
  disabled = false
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const currencySymbol = getCurrencySymbol(country);

  useEffect(() => {
    if (value > 0) {
      setDisplayValue(value.toLocaleString());
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleTextChange = (text: string) => {
    // Remove non-numeric characters except decimal point
    const numericText = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = numericText.split('.');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += '.' + parts[1].slice(0, 2); // Max 2 decimal places
    }

    setDisplayValue(formattedText);

    // Convert to number and notify parent
    const numericValue = parseFloat(formattedText) || 0;
    onValueChange(numericValue);
  };

  const formatDisplayValue = () => {
    if (!displayValue) return '';
    const numericValue = parseFloat(displayValue);
    if (isNaN(numericValue)) return displayValue;
    return numericValue.toLocaleString();
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[
        styles.inputContainer,
        error ? styles.errorContainer : null,
        disabled ? styles.disabledContainer : null
      ]}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          editable={!disabled}
          onBlur={() => setDisplayValue(formatDisplayValue())}
          onFocus={() => setDisplayValue(value > 0 ? value.toString() : '')}
        />
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
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorContainer: {
    borderColor: '#EF4444',
  },
  disabledContainer: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
});