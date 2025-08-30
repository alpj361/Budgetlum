import React, { PropsWithChildren } from "react";
import { Pressable, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface AnimatedPressableProps extends PropsWithChildren {
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  scaleOnPress?: number; // 0..1
  haptic?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export default function AnimatedPressable({
  onPress,
  className,
  disabled,
  children,
  scaleOnPress = 0.97,
  haptic = true,
  style,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = () => {
    scale.value = withSpring(scaleOnPress, { damping: 20, stiffness: 300 });
  };
  const pressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <Pressable disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} style={style}>
      <Animated.View className={className} style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
