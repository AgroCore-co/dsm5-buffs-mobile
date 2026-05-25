import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../../styles/colors";

type YellowButtonProps = {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function YellowButton({ title, onPress, disabled, loading }: YellowButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.black} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
    color: colors.black,
  },
  disabled: {
    backgroundColor: colors.border.default,
  },
});
