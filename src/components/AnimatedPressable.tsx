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

  // Comprehensive className to style conversion - bypasses CSS interop completely
  const getStyleFromClassName = React.useMemo(() => {
    if (!className) return {};

    const styles: ViewStyle = {};

    // Padding and margin
    if (className.includes('p-1')) styles.padding = 4;
    if (className.includes('p-2')) styles.padding = 8;
    if (className.includes('p-3')) styles.padding = 12;
    if (className.includes('p-4')) styles.padding = 16;
    if (className.includes('p-6')) styles.padding = 24;

    if (className.includes('py-1')) styles.paddingVertical = 4;
    if (className.includes('py-2')) styles.paddingVertical = 8;
    if (className.includes('py-3')) styles.paddingVertical = 12;
    if (className.includes('py-4')) styles.paddingVertical = 16;
    if (className.includes('py-6')) styles.paddingVertical = 24;

    if (className.includes('px-1')) styles.paddingHorizontal = 4;
    if (className.includes('px-2')) styles.paddingHorizontal = 8;
    if (className.includes('px-3')) styles.paddingHorizontal = 12;
    if (className.includes('px-4')) styles.paddingHorizontal = 16;
    if (className.includes('px-6')) styles.paddingHorizontal = 24;

    if (className.includes('-ml-2')) styles.marginLeft = -8;
    if (className.includes('-m-1')) styles.margin = -4;
    if (className.includes('m-1')) styles.margin = 4;
    if (className.includes('ml-2')) styles.marginLeft = 8;
    if (className.includes('mr-2')) styles.marginRight = 8;
    if (className.includes('mt-2')) styles.marginTop = 8;
    if (className.includes('mt-6')) styles.marginTop = 24;
    if (className.includes('mt-8')) styles.marginTop = 32;
    if (className.includes('mb-1')) styles.marginBottom = 4;
    if (className.includes('mb-2')) styles.marginBottom = 8;
    if (className.includes('mb-3')) styles.marginBottom = 12;
    if (className.includes('mb-4')) styles.marginBottom = 16;
    if (className.includes('mb-6')) styles.marginBottom = 24;

    // Padding top
    if (className.includes('pt-6')) styles.paddingTop = 24;

    // Border radius
    if (className.includes('rounded-xl')) styles.borderRadius = 12;
    if (className.includes('rounded-lg')) styles.borderRadius = 8;
    if (className.includes('rounded-md')) styles.borderRadius = 6;
    if (className.includes('rounded-full')) styles.borderRadius = 9999;

    // Background colors
    if (className.includes('bg-blue-600')) styles.backgroundColor = '#2563eb';
    if (className.includes('bg-blue-50')) styles.backgroundColor = '#eff6ff';
    if (className.includes('bg-gray-200')) styles.backgroundColor = '#e5e7eb';
    if (className.includes('bg-gray-50')) styles.backgroundColor = '#f9fafb';
    if (className.includes('bg-white')) styles.backgroundColor = '#ffffff';

    // Border
    if (className.includes('border-t') && className.includes('border-gray-200')) {
      styles.borderTopWidth = 1;
      styles.borderTopColor = '#e5e7eb';
    } else if (className.includes('border')) {
      styles.borderWidth = 1;
      if (className.includes('border-gray-200')) styles.borderColor = '#e5e7eb';
      if (className.includes('border-gray-100')) styles.borderColor = '#f3f4f6';
      if (className.includes('border-blue-600')) styles.borderColor = '#2563eb';
    }

    // Flexbox
    if (className.includes('flex-row')) styles.flexDirection = 'row';
    if (className.includes('flex-wrap')) styles.flexWrap = 'wrap';
    if (className.includes('items-center')) styles.alignItems = 'center';
    if (className.includes('justify-center')) styles.justifyContent = 'center';
    if (className.includes('justify-between')) styles.justifyContent = 'space-between';
    if (className.includes('flex-1')) styles.flex = 1;

    // Shadow
    if (className.includes('shadow-sm')) {
      styles.shadowColor = '#000000';
      styles.shadowOffset = { width: 0, height: 1 };
      styles.shadowOpacity = 0.05;
      styles.shadowRadius = 2;
      styles.elevation = 2;
    }
    if (className.includes('shadow-lg')) {
      styles.shadowColor = '#000000';
      styles.shadowOffset = { width: 0, height: 4 };
      styles.shadowOpacity = 0.1;
      styles.shadowRadius = 6;
      styles.elevation = 6;
    }

    // Width and Height
    if (className.includes('w-10')) styles.width = 40;
    if (className.includes('max-h-[280px]')) styles.maxHeight = 280;

    // Position
    if (className.includes('absolute')) {
      styles.position = 'absolute';
      if (className.includes('-top-4')) styles.top = -16;
      if (className.includes('left-0')) styles.left = 0;
      if (className.includes('right-0')) styles.right = 0;
      if (className.includes('bottom-0')) styles.bottom = 0;
    }

    return styles;
  }, [className]);

  return (
    <Pressable disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} style={style}>
      <Animated.View style={[animatedStyle, getStyleFromClassName]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
