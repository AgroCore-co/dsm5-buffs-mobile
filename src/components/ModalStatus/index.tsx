import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Modal } from "../Modal";
import { colors } from "../../styles/colors";

type Variant = "default" | "danger" | "success";

interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}) => {
  const variantStyles = getVariantStyles(variant);

  return (
    <Modal visible={visible} onClose={onCancel ?? (() => {})}>
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}

        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel ?? (() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: variantStyles.bg }]}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={[styles.confirmText, { color: variantStyles.text }]}>
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getVariantStyles = (variant: Variant) => {
  switch (variant) {
    case "danger":
      return {
        bg: colors.status.error,
        text: colors.text.onDark,
      };
    case "success":
      return {
        bg: colors.status.success,
        text: colors.text.onDark,
      };
    default:
      return {
        bg: colors.text.accent,
        text: colors.text.onDark,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    color: colors.text.muted,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.border.default,
    alignItems: "center",
  },
  cancelText: {
    color: colors.text.body,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmText: {
    fontWeight: "700",
  },
});