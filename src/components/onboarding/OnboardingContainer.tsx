import React from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedPressable from "../AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import ErrorBoundary from "../ErrorBoundary";

interface OnboardingContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  nextButtonText?: string;
  backButtonText?: string;
  nextDisabled?: boolean;
  showProgress?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

export default function OnboardingContainer({
  title,
  subtitle,
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  nextButtonText = "Continuar",
  backButtonText = "Atrás",
  nextDisabled = false,
  showProgress = true,
  showSkip = false,
  onSkip,
}: OnboardingContainerProps) {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <ErrorBoundary>
      <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header with Progress */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-4">
            {onBack ? (
              <AnimatedPressable onPress={onBack} className="p-2 -ml-2">
                <Ionicons name="chevron-back" size={24} color="#374151" />
              </AnimatedPressable>
            ) : (
              <View className="w-10" />
            )}

            {showSkip && onSkip && (
              <AnimatedPressable onPress={onSkip} className="p-2">
                <Text className="text-gray-500 font-medium">Omitir</Text>
              </AnimatedPressable>
            )}
          </View>

          {showProgress && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-600">
                  Paso {currentStep + 1} de {totalSteps}
                </Text>
                <Text className="text-sm font-medium text-blue-600">
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              <View className="bg-gray-200 rounded-full h-2">
                <View
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{
            flex: 1,
            width: '92%',
            alignSelf: 'center',
            marginHorizontal: 16,
            marginVertical: 8,
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          }}>
            {/* Title Section */}
            <View className="mb-8">
              <Text
                style={{
                  textAlign: 'center',
                  paddingTop: 20,
                  paddingBottom: 8,
                  width: '100%',
                  fontSize: 32,
                  fontWeight: '700',
                  color: '#111827',
                  lineHeight: 40,
                }}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={{
                    textAlign: 'center',
                    paddingTop: 8,
                    paddingBottom: 20,
                    paddingHorizontal: 12,
                    width: '100%',
                    fontSize: 18,
                    lineHeight: 26,
                    color: '#6B7280',
                    fontWeight: '400',
                  }}
                >
                  {subtitle}
                </Text>
              )}
            </View>

            {/* Main Content */}
            <View className="flex-1">
              {children}
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {onNext && (
          <View className="px-6 py-4 bg-white border-t border-gray-100">
            <AnimatedPressable
              onPress={onNext}
              disabled={nextDisabled}
              className={`rounded-xl py-4 items-center ${
                nextDisabled
                  ? "bg-gray-200"
                  : "bg-blue-600 shadow-sm"
              }`}
            >
              <Text
                className={`font-semibold text-lg ${
                  nextDisabled
                    ? "text-gray-400"
                    : "text-white"
                }`}
              >
                {nextButtonText}
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ErrorBoundary>
  );
}