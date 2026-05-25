import React from "react";
import { Modal as RNModal, View, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

interface ModalProps {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, children }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: "center", // mudar de "center" para "flex-end"
    alignItems: "center",
  },
  container: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 16,
    width: "90%", // ocupar toda a largura da tela
    borderTopLeftRadius: 16, // deixar arredondado somente no topo
    borderTopRightRadius: 16,
  },
});

