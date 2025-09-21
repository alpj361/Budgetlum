import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProgressIndicator, { ConfigurationStep } from '../../components/forms/ProgressIndicator';
import CurrencyInput from '../../components/forms/CurrencyInput';
import FrequencySelector, { PaymentFrequency } from '../../components/forms/FrequencySelector';
import ExpenseInput, { ExpenseItem, ExpenseCategory } from '../../components/forms/ExpenseInput';
import DebtInput, { DebtItem } from '../../components/forms/DebtInput';
import SummaryCard from '../../components/forms/SummaryCard';
import AnimatedPressable from '../../components/AnimatedPressable';

import { useUserStore } from '../../state/userStore';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type StructuredFinancialSetupNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'StructuredFinancialSetup'>;

interface IncomeData {
  amount: number;
  frequency: PaymentFrequency;
  paymentDates: string; // e.g., "1st and 15th"
}

interface FinancialData {
  income: IncomeData;
  expenses: ExpenseItem[];
  debts: DebtItem[];
}

export default function StructuredFinancialSetupScreen() {
  const navigation = useNavigation<StructuredFinancialSetupNavigationProp>();
  const { profile, updateProfile, addIncome, createBudget, setOnboardingStep } = useUserStore();

  const [currentStep, setCurrentStep] = useState<ConfigurationStep>('income');
  const [completedSteps, setCompletedSteps] = useState<ConfigurationStep[]>([]);

  const [financialData, setFinancialData] = useState<FinancialData>({
    income: {
      amount: 0,
      frequency: 'monthly',
      paymentDates: ''
    },
    expenses: [],
    debts: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'income':
        if (financialData.income.amount <= 0) {
          newErrors.income = 'El ingreso debe ser mayor a 0';
        }
        if (!financialData.income.paymentDates.trim()) {
          newErrors.paymentDates = 'Especifica cuándo recibes tus pagos';
        }
        break;

      case 'expenses':
        if (financialData.expenses.length === 0) {
          newErrors.expenses = 'Agrega al menos un gasto';
        }
        break;

      case 'debts':
        // Debts are optional, no validation needed
        break;

      case 'summary':
        // Final validation
        if (financialData.income.amount <= 0) {
          newErrors.income = 'Configuración de ingresos incompleta';
        }
        if (financialData.expenses.length === 0) {
          newErrors.expenses = 'Configuración de gastos incompleta';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    // Move to next step
    const stepOrder: ConfigurationStep[] = ['income', 'expenses', 'debts', 'summary'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    const stepOrder: ConfigurationStep[] = ['income', 'expenses', 'debts', 'summary'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const prevStep = stepOrder[currentIndex - 1];

    if (prevStep) {
      setCurrentStep(prevStep);
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      // Save income data
      const income = {
        id: 'primary-income',
        name: 'Ingreso Principal',
        type: 'salary' as const,
        amount: financialData.income.amount,
        frequency: financialData.income.frequency,
        isActive: true,
        isPrimary: true,
        isVariable: false,
        country: profile?.country || 'GT'
      };

      addIncome(income);

      // Update user profile
      updateProfile({
        primaryIncome: financialData.income.amount,
        payFrequency: financialData.income.frequency,
        hasSetupIncome: true,
        hasSetupBudget: true,
        budgetSetupMethod: 'structured'
      });

      // Create budget from expenses
      const budgetCategories = financialData.expenses.map(expense => {
        const categoryMap: Record<string, string> = {
          'housing': 'Vivienda',
          'food': 'Alimentación',
          'transportation': 'Transporte',
          'utilities': 'Servicios',
          'healthcare': 'Salud',
          'entertainment': 'Entretenimiento',
          'clothing': 'Ropa',
          'education': 'Educación',
          'family': 'Familia',
          'savings': 'Ahorros'
        };

        return {
          name: categoryMap[expense.categoryId] || expense.categoryId,
          limit: expense.amount,
          spent: 0,
          priority: 'essential' as const,
          isActive: true,
          period: 'monthly' as const
        };
      });

      // Add debt payments as budget categories
      financialData.debts.forEach(debt => {
        budgetCategories.push({
          name: `Pago ${debt.name}`,
          limit: debt.monthlyPayment,
          spent: 0,
          priority: debt.interestRate > 15 ? 'essential' as const : 'important' as const,
          isActive: true,
          period: 'monthly' as const
        });
      });

      const totalLimit = budgetCategories.reduce((sum, cat) => sum + cat.limit, 0);

      const budget = {
        name: 'Mi Presupuesto Estructurado',
        categories: budgetCategories,
        totalLimit,
        totalSpent: 0,
        period: 'monthly' as const,
        isActive: true
      };

      createBudget(budget);

      // Navigate to goals
      setOnboardingStep(5);
      navigation.navigate('Goals');

    } catch (error) {
      console.error('Error saving financial data:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración. Intenta de nuevo.');
    }
  };

  const calculateTotalExpenses = () => {
    return financialData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const calculateTotalDebtPayments = () => {
    return financialData.debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  };

  const calculateRemainingIncome = () => {
    return financialData.income.amount - calculateTotalExpenses() - calculateTotalDebtPayments();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'income':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📊 Configuración de Ingresos</Text>
            <Text style={styles.stepDescription}>
              Ingresa información específica sobre tus ingresos para crear un presupuesto preciso
            </Text>

            <CurrencyInput
              value={financialData.income.amount}
              onValueChange={(amount) => setFinancialData(prev => ({
                ...prev,
                income: { ...prev.income, amount }
              }))}
              label="¿Cuánto ganas aproximadamente?"
              country={profile?.country}
              error={errors.income}
            />

            <FrequencySelector
              value={financialData.income.frequency}
              onValueChange={(frequency) => setFinancialData(prev => ({
                ...prev,
                income: { ...prev.income, frequency }
              }))}
              label="¿Con qué frecuencia te pagan?"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>¿Qué días recibes tus pagos?</Text>
              <View style={styles.textInputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <View style={styles.textInput}>
                  <Text style={styles.textInputPlaceholder}>
                    Ej: "Los días 1 y 15", "Cada viernes", "Fin de mes"
                  </Text>
                </View>
              </View>
              {errors.paymentDates && (
                <Text style={styles.errorText}>{errors.paymentDates}</Text>
              )}
            </View>
          </View>
        );

      case 'expenses':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>💳 Configuración de Gastos</Text>
            <Text style={styles.stepDescription}>
              Agrega tus gastos por categorías. Esto nos ayudará a crear tu presupuesto personalizado.
            </Text>

            <ExpenseInput
              expenses={financialData.expenses}
              onAddExpense={(expense) => {
                const newExpense = {
                  ...expense,
                  id: Date.now().toString()
                };
                setFinancialData(prev => ({
                  ...prev,
                  expenses: [...prev.expenses, newExpense]
                }));
              }}
              onUpdateExpense={(id, updates) => {
                setFinancialData(prev => ({
                  ...prev,
                  expenses: prev.expenses.map(exp =>
                    exp.id === id ? { ...exp, ...updates } : exp
                  )
                }));
              }}
              onRemoveExpense={(id) => {
                setFinancialData(prev => ({
                  ...prev,
                  expenses: prev.expenses.filter(exp => exp.id !== id)
                }));
              }}
              country={profile?.country}
            />

            {errors.expenses && (
              <Text style={styles.errorText}>{errors.expenses}</Text>
            )}
          </View>
        );

      case 'debts':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📋 Configuración de Deudas</Text>
            <Text style={styles.stepDescription}>
              Agrega tus deudas para incluir los pagos en tu presupuesto. Esto es opcional pero recomendado.
            </Text>

            <DebtInput
              debts={financialData.debts}
              onAddDebt={(debt) => {
                const newDebt = {
                  ...debt,
                  id: Date.now().toString(),
                  priority: debt.interestRate > 15 ? 1 : debt.interestRate > 8 ? 2 : 3
                };
                setFinancialData(prev => ({
                  ...prev,
                  debts: [...prev.debts, newDebt]
                }));
              }}
              onUpdateDebt={(id, updates) => {
                setFinancialData(prev => ({
                  ...prev,
                  debts: prev.debts.map(debt =>
                    debt.id === id ? { ...debt, ...updates } : debt
                  )
                }));
              }}
              onRemoveDebt={(id) => {
                setFinancialData(prev => ({
                  ...prev,
                  debts: prev.debts.filter(debt => debt.id !== id)
                }));
              }}
              country={profile?.country}
            />
          </View>
        );

      case 'summary':
        const totalExpenses = calculateTotalExpenses();
        const totalDebtPayments = calculateTotalDebtPayments();
        const remainingIncome = calculateRemainingIncome();

        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📝 Resumen Final</Text>
            <Text style={styles.stepDescription}>
              Revisa tu configuración antes de crear tu presupuesto personalizado.
            </Text>

            <SummaryCard
              title="💰 Ingresos"
              items={[
                { label: 'Monto', value: financialData.income.amount, type: 'currency' },
                { label: 'Frecuencia', value: financialData.income.frequency, type: 'frequency' },
                { label: 'Días de pago', value: financialData.income.paymentDates || 'No especificado' }
              ]}
              onEdit={() => setCurrentStep('income')}
              country={profile?.country}
            />

            <SummaryCard
              title="💳 Gastos Totales"
              items={[
                { label: 'Total mensual', value: totalExpenses, type: 'currency' },
                { label: 'Categorías', value: `${financialData.expenses.length} configuradas` }
              ]}
              onEdit={() => setCurrentStep('expenses')}
              country={profile?.country}
              backgroundColor="#FEF3C7"
              accentColor="#F59E0B"
            />

            {financialData.debts.length > 0 && (
              <SummaryCard
                title="📋 Pagos de Deudas"
                items={[
                  { label: 'Total mensual', value: totalDebtPayments, type: 'currency' },
                  { label: 'Deudas', value: `${financialData.debts.length} registradas` }
                ]}
                onEdit={() => setCurrentStep('debts')}
                country={profile?.country}
                backgroundColor="#FEE2E2"
                accentColor="#EF4444"
              />
            )}

            <View style={[
              styles.balanceCard,
              { backgroundColor: remainingIncome >= 0 ? '#F0FDF4' : '#FEE2E2' }
            ]}>
              <Text style={[
                styles.balanceTitle,
                { color: remainingIncome >= 0 ? '#065F46' : '#DC2626' }
              ]}>
                {remainingIncome >= 0 ? '✅ Presupuesto Balanceado' : '⚠️ Gastos Exceden Ingresos'}
              </Text>
              <Text style={[
                styles.balanceAmount,
                { color: remainingIncome >= 0 ? '#059669' : '#DC2626' }
              ]}>
                Restante: ${remainingIncome.toLocaleString()}
              </Text>
              <Text style={styles.balanceDescription}>
                {remainingIncome >= 0
                  ? 'Tienes un presupuesto saludable con dinero disponible para ahorros.'
                  : 'Considera reducir gastos o revisar tus categorías de presupuesto.'
                }
              </Text>
            </View>

            {errors.income && <Text style={styles.errorText}>{errors.income}</Text>}
            {errors.expenses && <Text style={styles.errorText}>{errors.expenses}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <AnimatedPressable
          style={[
            styles.nextButton,
            currentStep === 'summary' ? styles.completeButton : null
          ]}
          onPress={currentStep === 'summary' ? handleComplete : handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 'summary' ? 'Crear Presupuesto' : 'Continuar'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
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
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
  },
  textInputPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  balanceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});