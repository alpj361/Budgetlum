import React, { PropsWithChildren } from "react";
import { Pressable, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface SafeAnimatedPressableProps extends PropsWithChildren {
  onPress?: () => void;
  disabled?: boolean;
  scaleOnPress?: number; // 0..1
  haptic?: boolean;
  style?: ViewStyle | ViewStyle[];
  // Pre-converted styles instead of className to avoid CSS interop issues
  pressableStyle?: ViewStyle;
}

export default function SafeAnimatedPressable({
  onPress,
  disabled,
  children,
  scaleOnPress = 0.97,
  haptic = true,
  style,
  pressableStyle,
}: SafeAnimatedPressableProps) {
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
      <Animated.View style={[animatedStyle, pressableStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}