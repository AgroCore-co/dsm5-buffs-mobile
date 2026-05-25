import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { colors } from "../../styles/colors";
import Back from "../../../assets/images/arrow.svg";
import Pen from "../../../assets/images/pen.svg";

export const ZootecnicoDetailModal = ({ visible, onClose, item }: any) => {
  if (!item) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...item });

  // Alterna o modo de edição
  const toggleEdit = () => {
    if (isEditing) {
      // Aqui você pode salvar as alterações futuramente
      console.log("Dados salvos:", formData);
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (key: string, value: string, p0: boolean) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Back width={25} height={25} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalhes do Evento</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Conteúdo */}
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.centerBlock}>
                <Text style={styles.label}>
                  Registro {formData.tipo_pesagem ?? ""}
                </Text>
                <Text style={styles.date}>
                  {formData?.dt_registro
                    ? formData.dt_registro.split("T")[0].split("-").reverse().join("/")
                    : "Nda"}
                </Text>
              </View>

              {/* Linhas de dados */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Peso (Kg)</Text>
                  <TextInput
                    style={[styles.value, isEditing && styles.inputEditable]}
                    editable={isEditing}
                    value={formData.peso?.toString() ?? ""}
                    onChangeText={(t) => handleChange("peso", t, true)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Condição Corporal</Text>
                  <TextInput
                    style={[styles.value, isEditing && styles.inputEditable]}
                    editable={isEditing}
                    keyboardType="numeric"
                    value={formData.condicao_corporal?.toString() ?? ""}
                    onChangeText={(t) => handleChange("condicao_corporal", t, true)}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Cor Pelagem</Text>
                  <TextInput
                    style={[styles.value, isEditing && styles.inputEditable]}
                    editable={isEditing}
                    value={formData.cor_pelagem ?? ""}
                    onChangeText={(t) => handleChange("cor_pelagem", t, false)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Formato Chifre</Text>
                  <TextInput
                    style={[styles.value, isEditing && styles.inputEditable]}
                    editable={isEditing}
                    value={formData.formato_chifre ?? ""}
                    onChangeText={(t) => handleChange("formato_chifre", t, false)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Porte Corporal</Text>
                  <TextInput
                    style={[styles.value, isEditing && styles.inputEditable]}
                    editable={isEditing}
                    value={formData.porte_corporal ?? ""}
                    onChangeText={(t) => handleChange("porte_corporal", t, false)}
                  />
                </View>
              </View>

              {formData.retorno && (
                <View style={styles.infoBlock}>
                  <Text style={styles.label}>Data de Retorno</Text>
                  <Text style={styles.value}>
                    {formData.dt_retorno ?? "-"}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Rodapé */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={toggleEdit}
            >
              <Pen width={25} height={25} />
              <Text style={styles.editText}>
                {isEditing ? "Salvar Alterações" : "Editar Registro"}
              </Text>
            </TouchableOpacity>
            {!isEditing && (
              <TouchableOpacity style={[styles.button, styles.deleteButton]}>
                <Text style={styles.deleteText}>Excluir Registro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ======== ESTILOS ========
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: "center",
  },
  modal: {
    backgroundColor: colors.bg.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "95%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.heading,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  centerBlock: { alignItems: "center", marginBottom: 8 },
  label: { fontSize: 12, color: colors.text.muted },
  date: { fontSize: 22, fontWeight: "700", color: colors.brand.dark },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.title,
    borderBottomWidth: 0,
  },
  inputEditable: {
    borderBottomWidth: 1,
    borderColor: colors.brand.primary,
    paddingVertical: 2,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  col: { flex: 1 },
  infoBlock: { marginBottom: 8 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
  },
  editButton: {
    backgroundColor: colors.brand.primary,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  editText: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text.accent,
    marginLeft: 6,
  },
  deleteText: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.status.error,
  },
});
