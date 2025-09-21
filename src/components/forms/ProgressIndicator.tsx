import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ConfigurationStep = 'income' | 'expenses' | 'debts' | 'summary';

interface ProgressIndicatorProps {
  currentStep: ConfigurationStep;
  completedSteps: ConfigurationStep[];
}

const steps: { key: ConfigurationStep; label: string; icon: string }[] = [
  { key: 'income', label: 'Ingresos', icon: 'cash-outline' },
  { key: 'expenses', label: 'Gastos', icon: 'card-outline' },
  { key: 'debts', label: 'Deudas', icon: 'document-text-outline' },
  { key: 'summary', label: 'Resumen', icon: 'checkmark-circle-outline' },
];

export default function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  const getStepStatus = (stepKey: ConfigurationStep) => {
    if (completedSteps.includes(stepKey)) return 'completed';
    if (stepKey === currentStep) return 'current';
    return 'pending';
  };

  const getStepIndex = (stepKey: ConfigurationStep) => {
    return steps.findIndex(step => step.key === stepKey);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentIndex / (steps.length - 1)) * 100}%` }
          ]}
        />
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);

          return (
            <View key={step.key} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                status === 'completed' ? styles.completedCircle :
                status === 'current' ? styles.currentCircle :
                styles.pendingCircle
              ]}>
                <Ionicons
                  name={status === 'completed' ? 'checkmark' : step.icon as any}
                  size={status === 'completed' ? 16 : 20}
                  color={
                    status === 'completed' ? 'white' :
                    status === 'current' ? '#3B82F6' :
                    '#9CA3AF'
                  }
                />
              </View>

              <Text style={[
                styles.stepLabel,
                status === 'completed' ? styles.completedLabel :
                status === 'current' ? styles.currentLabel :
                styles.pendingLabel
              ]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
  },
  completedCircle: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  currentCircle: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  pendingCircle: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  completedLabel: {
    color: '#065F46',
  },
  currentLabel: {
    color: '#1D4ED8',
  },
  pendingLabel: {
    color: '#6B7280',
  },
});