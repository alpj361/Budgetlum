import React from "react";
import { Modal, View, Text } from "react-native";
import AnimatedPressable from "./AnimatedPressable";

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 items-center justify-end">
        <View className="bg-white w-full rounded-t-3xl p-6">
          <Text className="text-lg font-semibold text-gray-900 mb-1">{title}</Text>
          {!!message && <Text className="text-gray-600 mb-4">{message}</Text>}
          <View className="flex-row space-x-3">
            <AnimatedPressable onPress={onClose} className="flex-1 py-3 rounded-xl border border-gray-200">
              <Text className="text-center font-medium text-gray-700">{cancelLabel}</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => { onClose(); onConfirm(); }} className="flex-1 py-3 rounded-xl bg-red-600">
              <Text className="text-center font-medium text-white">{confirmLabel}</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
