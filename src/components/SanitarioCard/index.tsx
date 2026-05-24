import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";

import { colors } from "../../styles/colors";

import { formatarDataBR } from "../../utils/date";

import Calendar from "../../../assets/images/calendar-clock.svg";

export const SanitarioCard = ({
  item,
  onDelete,
  onPress,
}: any) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.leftAccent} />

    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.diseaseContainer}>
          <Text style={styles.diseaseText}>
            {item.doenca ??
              "Sem diagnóstico"}
          </Text>
        </View>

        <View style={styles.dateContainer}>
          <Calendar
            width={13}
            height={13}
            fill={colors.text.secondary}
          />

          <Text style={styles.textData}>
            {formatarDataBR(
              item?.dtAplicacao
            )}
          </Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.mainInfo}>
          <Text style={styles.label}>
            Medicação
          </Text>

          <Text
            style={styles.value}
            numberOfLines={1}
          >
            {item.nome_medicamento ??
              "-"}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.mainInfo}>
          <Text style={styles.label}>
            Dosagem
          </Text>

          <Text
            style={styles.value}
            numberOfLines={1}
          >
            {item.dosagem
              ? `${item.dosagem} ${item.unidadeMedida}`
              : "-"}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaText}>
            Retorno:{" "}
            {item.necessitaRetorno
              ? "Sim"
              : "Não"}
          </Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  leftAccent: {
    width: 4,
    backgroundColor: colors.brand.primary,
  },

  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 8,
  },

  diseaseContainer: {
    flex: 1,
  },

  diseaseText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.accent,
    textTransform: "uppercase",
  },

  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  textData: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
  },

  infoSection: {
    marginTop: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  mainInfo: {
    flex: 1,
  },

  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.secondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },

  divider: {
    width: 1,
    height: 30,
    backgroundColor:
      colors.border.default,

    marginHorizontal: 12,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,

    marginTop: 12,
    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor:
      colors.border.default,
  },

  metaBadge: {
    backgroundColor:
      colors.bg.section,

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 8,
  },

  metaText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
  },

  deleteButton: {
    padding: 8,
  },

  deleteText: {
    color: colors.status.error,
    fontSize: 18,
    fontWeight: "bold",
  },
});