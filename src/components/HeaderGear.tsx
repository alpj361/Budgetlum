import React from "react";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "./AnimatedPressable";
import { useNavigation } from "@react-navigation/native";

export default function HeaderGear() {
  const navigation = useNavigation<any>();
  return (
    <AnimatedPressable className="mr-3" onPress={() => navigation.navigate("Settings")}> 
      <Ionicons name="settings-outline" size={22} color="#1f2937" />
    </AnimatedPressable>
  );
}
