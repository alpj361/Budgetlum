import React from "react";
import { Modal, View, Text } from "react-native";
import AnimatedPressable from "./AnimatedPressable";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({ visible, title, message, confirmLabel = "Eliminar", cancelLabel = "Cancelar", onConfirm, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(150)}
        className="flex-1 bg-black/40 items-center justify-end"
      >
        <Animated.View 
          entering={SlideInDown.springify().damping(20).stiffness(300)} 
          exiting={SlideOutDown.springify().damping(20).stiffness(300)}
          className="bg-white w-full rounded-t-3xl p-6"
        >
          <Text className="text-xl font-semibold text-gray-900 mb-2">{title}</Text>
          {!!message && <Text className="text-gray-600 mb-6 text-base">{message}</Text>}
          <View className="flex-row" style={{ gap: 12 }}>
            <AnimatedPressable onPress={onClose} className="flex-1 py-4 rounded-2xl border border-gray-200">
              <Text className="text-center font-medium text-gray-700 text-base">{cancelLabel}</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => { onClose(); onConfirm(); }} className="flex-1 py-4 rounded-2xl bg-red-600">
              <Text className="text-center font-medium text-white text-base">{confirmLabel}</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
