import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { colors } from "../../styles/colors";
import { ConfirmModal } from "../ModalStatus";
import { encerrarLactacao } from "../../services/lactacaoService";


export type CardLactacaoProps = {
  animal: any;
  onPress?: () => void;
  onStatusChanged?: () => void;
};

export const CardLactacao: React.FC<CardLactacaoProps> = ({ animal, onPress, onStatusChanged }) => {
  const isLactando = animal.status === "Em Lactação";
  const [isEnabled, setIsEnabled] = useState(isLactando);
  const [modalVisible, setModalVisible] = useState(false);
  const toggleSwitch = () => {
    setModalVisible(true);
  };

  const confirmarSecagem = async () => {
    try {
      await encerrarLactacao(animal.idCicloLactacao);

      setIsEnabled(false);

      if (onStatusChanged) onStatusChanged();

    } catch (err) {
      console.log("Erro ao encerrar lactação:", err);
    } finally {
      setModalVisible(false);
    }
  };
  
  return (
    <>
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <View
        style={[
          styles.statusBar,
          { backgroundColor: isLactando ? colors.status.successActive : colors.status.errorFade },
        ]}
      />
      <View style={styles.content}>
        {/* Cabeçalho */}
        <View style={styles.header}>
        <View>
          <Text style={styles.nome}>{animal.nome || "Sem nome"}</Text>
          <Text style={styles.brinco}>Brinco: Nº {animal.brinco}</Text>
        </View>
        <View style={[styles.statusBadge, !isEnabled && styles.statusBadgeSeca]}>
          <View style={[ styles.statusDot, { backgroundColor: isEnabled ? colors.status.success : colors.status.error, }, ]} />
          <Text style={[ styles.statusText, { color: isEnabled ? colors.status.successText : colors.status.errorText, },]}>
            {isEnabled ? "Em Lactação" : "Seca"}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={toggleSwitch}
            trackColor={{ false: colors.border.default, true: colors.border.default }}
            thumbColor={isEnabled ? colors.status.success : colors.status.error}
          />
        </View>
        </View>


        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Raça:</Text>
            <Text style={styles.chipValue}>{animal.raca || "—"}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Ciclo:</Text>
            <Text style={styles.chipValue}>{animal.cicloAtual ? `${animal.cicloAtual}º` : "—"}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Dias Lactação:</Text>
            <Text style={styles.chipValue}>{animal.diasEmLactacao ?? "—"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>

    <ConfirmModal
        visible={modalVisible}
        title="Confirmar Secagem"
        message={`Deseja marcar a vaca ${animal.nome} como seca?`}
        confirmText="Sim, Secar"
        cancelText="Cancelar"
        onCancel={() => setModalVisible(false)}
        onConfirm={confirmarSecagem}
    />
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    marginBottom: 10,
  },
  statusBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    paddingLeft: 10,
  },
  header: {
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nome: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text.title,
  },
  brinco: {
    fontSize: 13,
    color: colors.text.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 6,
    gap: 5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.section,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.body,
    marginRight: 4,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.body,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  footerHighlight: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.brand.primary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minHeight: 40,
    gap: 4,
    alignSelf: "flex-start", // 👈 evita esticar
  },

  statusBadgeSeca: {
    paddingHorizontal: 0, // 👈 MAIS ESPAÇO quando Seca
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 4 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '500' 
  },
});
