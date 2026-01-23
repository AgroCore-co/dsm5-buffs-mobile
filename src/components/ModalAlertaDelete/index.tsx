import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { colors } from "../../styles/colors"; 

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string; // Título customizável (Ex: "Excluir Registro")
  message: string; // Mensagem customizável
};

export const ConfirmarExclusaoModal = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
}: Props) => {

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{title}</Text>

          <Text style={styles.modalMessage}>
            {message}
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnCancelar} onPress={onClose}>
              <Text style={styles.btnTextCancelar}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnConfirmar} onPress={onConfirm}>
              <Text style={styles.btnTextConfirmar}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ======== ESTILOS (Adaptados para exclusão) ========
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btnCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray.base,
    backgroundColor: colors.white.base,
  },
  btnConfirmar: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.red.base, // Usar vermelho para exclusão
  },
  btnTextCancelar: {
    color: colors.gray.base,
    fontWeight: "600",
  },
  btnTextConfirmar: {
    color: colors.white.base, // Texto branco no botão vermelho
    fontWeight: "600",
  },
});