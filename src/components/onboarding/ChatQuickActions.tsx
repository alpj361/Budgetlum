import React from "react";
import { View, Text, Pressable } from "react-native";

export interface QuickAction {
  id: string;
  label: string;
  payload: string;
}

interface Props {
  actions: QuickAction[];
  onSelect: (payload: string) => void;
  disabled?: boolean;
}

export const ChatQuickActions: React.FC<Props> = ({ actions, onSelect, disabled }) => {
  if (actions.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => onSelect(action.payload)}
          disabled={disabled}
          style={{
            backgroundColor: disabled ? "#E5E7EB" : "#EEF2FF",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#312E81", fontWeight: "600" }}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};
