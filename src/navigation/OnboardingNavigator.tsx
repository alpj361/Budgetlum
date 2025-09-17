import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStep } from "../types/user";

// Import onboarding screens
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import PersonalInfoScreen from "../screens/onboarding/PersonalInfoScreen";
import IncomeSetupScreen from "../screens/onboarding/IncomeSetupScreen";
import IncomePathSelectionScreen from "../screens/onboarding/IncomePathSelectionScreen";
import SimpleIncomeSetupScreen from "../screens/onboarding/SimpleIncomeSetupScreen";
import AdvancedIncomeSetupScreen from "../screens/onboarding/AdvancedIncomeSetupScreen";
import ExpenseProfileScreen from "../screens/onboarding/ExpenseProfileScreen";
import GoalsScreen from "../screens/onboarding/GoalsScreen";
import BudgetPreferencesScreen from "../screens/onboarding/BudgetPreferencesScreen";
import OnboardingCompleteScreen from "../screens/onboarding/OnboardingCompleteScreen";

export type OnboardingStackParamList = {
  Welcome: undefined;
  PersonalInfo: undefined;
  IncomeSetup: undefined;
  IncomePathSelection: undefined;
  SimpleIncomeSetup: undefined;
  AdvancedIncomeSetup: undefined;
  ExpenseProfile: undefined;
  Goals: undefined;
  BudgetPreferences: undefined;
  OnboardingComplete: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false, // We'll handle our own header in each screen
        gestureEnabled: false, // Prevent swipe back during onboarding
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="IncomeSetup" component={IncomeSetupScreen} />
      <Stack.Screen name="IncomePathSelection" component={IncomePathSelectionScreen} />
      <Stack.Screen name="SimpleIncomeSetup" component={SimpleIncomeSetupScreen} />
      <Stack.Screen name="AdvancedIncomeSetup" component={AdvancedIncomeSetupScreen} />
      <Stack.Screen name="ExpenseProfile" component={ExpenseProfileScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="BudgetPreferences" component={BudgetPreferencesScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </Stack.Navigator>
  );
}

// Helper function to get screen name from step number
export const getScreenFromStep = (step: number): keyof OnboardingStackParamList => {
  switch (step) {
    case 0: return "Welcome";
    case 1: return "PersonalInfo";
    case 2: return "IncomePathSelection"; // Changed to path selection
    case 3: return "ExpenseProfile";
    case 4: return "Goals";
    case 5: return "BudgetPreferences";
    case 6: return "OnboardingComplete";
    default: return "Welcome";
  }
};

// Helper function to get step number from screen name
export const getStepFromScreen = (screen: keyof OnboardingStackParamList): number => {
  switch (screen) {
    case "Welcome": return 0;
    case "PersonalInfo": return 1;
    case "IncomeSetup": return 2; // Legacy support
    case "IncomePathSelection": return 2;
    case "SimpleIncomeSetup": return 2;
    case "AdvancedIncomeSetup": return 2;
    case "ExpenseProfile": return 3;
    case "Goals": return 4;
    case "BudgetPreferences": return 5;
    case "OnboardingComplete": return 6;
    default: return 0;
  }
};