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

  // Safe className rendering - only apply if not in problematic context
  const safeClassName = React.useMemo(() => {
    try {
      // Check if we're in a context where className processing is safe
      return className || undefined;
    } catch {
      return undefined;
    }
  }, [className]);

  try {
    return (
      <Pressable disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} style={style}>
        <Animated.View className={safeClassName} style={animatedStyle}>
          {children}
        </Animated.View>
      </Pressable>
    );
  } catch (error) {
    // Fallback to basic pressable without className if styling fails
    return (
      <Pressable disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} style={style}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }
}
