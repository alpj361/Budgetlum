import React from "react";
import { View, Text } from "react-native";

type StepStatus = "complete" | "current" | "upcoming";

interface StepConfig {
  id: string;
  label: string;
  status: StepStatus;
}

interface Props {
  steps: StepConfig[];
}

export const ChatProgressIndicator: React.FC<Props> = ({ steps }) => {
  return (
    <View style={{ marginVertical: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        {steps.map((step) => {
          const isComplete = step.status === "complete";
          const isCurrent = step.status === "current";

          return (
            <View key={step.id} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isComplete ? "#4ADE80" : isCurrent ? "#6366F1" : "#E5E7EB",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: isCurrent || isComplete ? "white" : "#1F2937", fontWeight: "600" }}>
                  {step.label.slice(0, 1)}
                </Text>
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#374151", textAlign: "center" }}>{step.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ height: 2, backgroundColor: "#E5E7EB", position: "relative" }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${(steps.filter((s) => s.status === "complete").length / Math.max(steps.length, 1)) * 100}%`,
            backgroundColor: "#6366F1",
          }}
        />
      </View>
    </View>
  );
};
