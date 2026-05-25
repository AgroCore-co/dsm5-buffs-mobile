import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";

import { colors } from "../../styles/colors";

import { ConfirmModal } from "../ModalStatus";

import { encerrarLactacao } from "../../services/lactacaoService";

import IconBuffs from "../../icons/agroCore";

export type CardLactacaoProps = {
  animal: {
    nome?: string;
    brinco?: string;
    status: string;
    raca?: string;
    cicloAtual?: number | null;
    diasEmLactacao?: number | null;
    idCicloLactacao?: string;
  };
  onPress?: () => void;
  onStatusChanged?: () => void;
};

export const CardLactacao: React.FC<
  CardLactacaoProps
> = ({
  animal,
  onPress,
  onStatusChanged,
}) => {
  const isLactando =
    animal.status === "Em Lactação";

  const [isEnabled, setIsEnabled] =
    useState(isLactando);

  const [modalVisible, setModalVisible] =
    useState(false);

  const toggleSwitch = () => {
    setModalVisible(true);
  };

  const confirmarSecagem = async () => {
    try {
      await encerrarLactacao(
        animal.idCicloLactacao ?? ""
      );

      setIsEnabled(false);

      if (onStatusChanged)
        onStatusChanged();
    } catch (err) {
      console.log(
        "Erro ao encerrar lactação:",
        err
      );
    } finally {
      setModalVisible(false);
    }
  };

  const statusColor = isEnabled
    ? {
        bg: colors.status.success,
        soft: colors.status.successBg,
      }
    : {
        bg: colors.status.error,
        soft: colors.status.errorBg,
      };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <IconBuffs
              width={24}
              height={24}
              fill={statusColor.bg}
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.info}>
              <Text style={styles.title}>
                {animal.nome ||
                  "Sem nome"}
              </Text>

              <Text
                style={styles.subtitle}
              >
                Brinco Nº{" "}
                {animal.brinco}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusColor.soft,
                },
              ]}
            >
              <Text style={styles.statusText} >
                {isEnabled
                  ? "Em Lactação"
                  : "Seca"}
              </Text>
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Text
                style={styles.detailLabel}
              >
                Raça:
              </Text>

              <Text
                style={styles.detailValue}
              >
                {animal.raca || "—"}
              </Text>

              <Text
                style={styles.detailLabel}
              >
                Ciclo:
              </Text>

              <Text
                style={styles.detailValue}
              >
                {animal.cicloAtual != null && !isNaN(animal.cicloAtual)
                  ? `${animal.cicloAtual}º`
                  : "—"}
              </Text>

              <Text
                style={styles.detailLabel}
              >
                Dias Lactação:
              </Text>

              <Text
                style={styles.detailValue}
              >
                {animal.diasEmLactacao != null && !isNaN(animal.diasEmLactacao)
                  ? animal.diasEmLactacao
                  : "—"}
              </Text>
            </View>

            <View style={styles.switchRow}>
              <Text
                style={styles.switchLabel}
              >
                Encerrar lactação
              </Text>

              <Switch
                value={isEnabled}
                onValueChange={toggleSwitch}

                style={{
                  transform: [
                    { scaleX: 1.15 },
                    { scaleY: 1.15 },
                  ],
                }}

                trackColor={{
                  false: colors.border.default,
                  true: colors.status.successBg,
                }}

                thumbColor={
                  isEnabled
                    ? colors.status.success
                    : colors.text.secondary
                }

                ios_backgroundColor={
                  colors.border.default
                }
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <ConfirmModal
        visible={modalVisible}
        title="Confirmar Secagem"
        message={`Deseja marcar ${animal.nome} como seca?`}
        confirmText="Sim, Secar"
        cancelText="Cancelar"
        onCancel={() =>
          setModalVisible(false)
        }
        onConfirm={confirmarSecagem}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingRight: 14,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  iconContainer: {
    width: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  info: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text.accent,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.text.secondary,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.accent,
  },

  details: {
    marginTop: 12,
    gap: 8,
  },

  detailItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  detailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.accent,
  },

  switchRow: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  switchLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.accent,
  },
});