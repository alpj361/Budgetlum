import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HeaderGear from "../components/HeaderGear";
import AnimatedPressable from "../components/AnimatedPressable";

import DashboardScreen from "../screens/DashboardScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import InsightsScreen from "../screens/InsightsScreen";
import BudgetScreen from "../screens/BudgetScreen";
import StatementUploadScreen from "../screens/StatementUploadScreen";
import NotesBulkScreen from "../screens/NotesBulkScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
       screenOptions={({ route }) => ({
        headerRight: () => (<HeaderGear />),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Add") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Insights") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Budget") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else {
            iconName = "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
          color: "#1f2937",
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Overview" }} />
      <Tab.Screen name="Add" component={AddExpenseScreen} options={{ title: "Add Expense" }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ title: "Insights" }} />
      <Tab.Screen name="Budget" component={BudgetScreen} options={{ title: "Budget" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MainTabs">
        <Stack.Screen
          name="Settings"
          component={require("../screens/SettingsScreen").default}
          options={({ navigation }) => ({
            title: "Configuración",
            presentation: "formSheet",
            headerLeft: () => (
              <HeaderBack navigation={navigation} />
            ),
          })}
        />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="StatementUpload"
          component={StatementUploadScreen}
          options={{ title: "Upload Statement", presentation: "formSheet" }}
        />
      <Stack.Screen
          name="NotesBulk"
          component={NotesBulkScreen}
          options={{ title: "Add From Notes", presentation: "formSheet" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HeaderBack({ navigation }: any) {
  return (
    <AnimatedPressable className="ml-1" onPress={() => navigation.goBack()}>
      <Ionicons name="chevron-back" size={24} color="#1f2937" />
    </AnimatedPressable>
  );
}

