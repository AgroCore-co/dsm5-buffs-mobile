import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { colors } from "../../styles/colors";
import IconBuffs from "../../icons/agroCore";

export type CardReproducaoProps = {
  reproducao: any;
  onPress?: () => void;
};

type StatusType =
  | "Em andamento"
  | "Confirmada"
  | "Concluída"
  | "Falhou";

const normalizeStatus = (
  status: string
): StatusType => {
  if (status === "Em andamento")
    return "Em andamento";

  if (status === "Confirmada")
    return "Confirmada";

  if (status === "Concluída")
    return "Concluída";

  if (
    status === "Falhou" ||
    status === "Falha"
  )
    return "Falhou";

  return "Em andamento";
};

export const CardReproducao: React.FC<
  CardReproducaoProps
> = ({ reproducao, onPress }) => {
  const status = normalizeStatus(
    reproducao.status
  );

  const statusColors: Record<
    StatusType,
    {
      bg: string;
      text: string;
      soft: string;
    }
  > = {
    "Em andamento": {
      bg: colors.status.warning,
      text: colors.status.pendingBg,
      soft: colors.status.warningBg,
    },

    "Confirmada": {
      bg: colors.status.warning,
      text: colors.status.pendingBg,
      soft: colors.status.warningBg,
    },

    "Concluída": {
      bg: colors.status.success,
      text: colors.status.successActive,
      soft: colors.status.successBg,
    },

    "Falhou": {
      bg: colors.status.error,
      text: colors.status.errorFade,
      soft: colors.status.errorBg,
    },
  };

  const color = statusColors[status];

  const materialGenetico =
    !reproducao.brincoTouro
      ? reproducao.id_semen ||
        reproducao.id_ovulo
        ? `${(
            reproducao.id_semen ||
            reproducao.id_ovulo
          ).slice(0, 5)}`
        : "—"
      : null;

  const concluidaValue =
    status === "Falhou"
      ? "Não, falhou"
      : status === "Concluída"
      ? reproducao.tipo_parto
        ? `Parto ${reproducao.tipo_parto.toLowerCase()}`
        : "Sucesso"
      : status === "Confirmada"
      ? "Prenha"
      : "Acompanhamento";

  return (
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
            fill={color.bg}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.title}>
              {reproducao.brincoBufala ||
                "Sem identificação"}
            </Text>

            {!!reproducao.brincoTouro && (
              <Text style={styles.subtitle}>
                Reprodutor:{" "}
                {
                  reproducao.brincoTouro
                }
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  color.soft,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Inseminação:
            </Text>

            <Text style={styles.detailValue}>
              {reproducao.tipo_inseminacao ||
                "—"}
            </Text>

            <Text style={styles.detailLabel}>
              Cruzamento:
            </Text>

            <Text style={styles.detailValue}>
              {reproducao.dataCruzamento ||
                "—"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Resultado:
            </Text>

            <Text style={styles.detailValue}>
              {concluidaValue}
            </Text>
          </View>

          {!!materialGenetico && (
            <View style={styles.detailItem}>
              <Text
                style={styles.detailLabel}
              >
                Material
              </Text>

              <Text
                style={styles.detailValue}
              >
                {materialGenetico}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
});