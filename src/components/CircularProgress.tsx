import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  size?: number;
  stroke?: number;
  progress: number; // 0-1
  color?: string;
  bgColor?: string;
  label?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({ size = 64, stroke = 6, progress, color = "#3b82f6", bgColor = "#e5e7eb", label, children }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = circumference * clamped;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={bgColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children || (!!label && <Text className="text-gray-900 font-semibold">{label}</Text>)}
    </View>
  );
}
