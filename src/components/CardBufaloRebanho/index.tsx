import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { colors } from "../../styles/colors";

import IconBuffs from "../../icons/agroCore";

export type CardBufaloProps = {
  nome: string;
  brinco: string;
  status: boolean;
  sexo: "F" | "M";
  maturidade: string;
  raca?: string;
  categoria?: string;
  onPress?: () => void;
};

export const CardBufalo: React.FC<
  CardBufaloProps
> = ({
  nome,
  brinco,
  status,
  sexo,
  maturidade,
  raca,
  categoria,
  onPress,
}) => {
  const isAtivo = status === true;

  const maturidadeMap: Record<
    string,
    string
  > = {
    B: "Bezerro",
    N: "Novilha",
    T: "Touro",
    V: "Vaca",
  };

  const maturidadeTexto =
    maturidadeMap[maturidade] ||
    maturidade;

  const statusColor = isAtivo
    ? {
        bg: colors.status.success,
        soft: colors.status.successBg,
        text:
          colors.status.successActive,
      }
    : {
        bg: colors.status.error,
        soft: colors.status.errorBg,
        text: colors.status.errorFade,
      };

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
            fill={statusColor.bg}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.title}>
              {nome}
            </Text>

            <Text style={styles.subtitle}>
              Brinco Nº {brinco}
            </Text>
          </View>

          {categoria ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categoria}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Sexo:
            </Text>

            <Text style={styles.detailValue}>
              {sexo === "F"
                ? "♀ Fêmea"
                : "♂ Macho"}
            </Text>

            <Text style={styles.detailLabel}>
              | Maturidade:
            </Text>

            <Text style={styles.detailValue}>
              {maturidadeTexto}
            </Text>
            
            <Text style={styles.detailLabel}>
              | Raça:
            </Text>

            <Text style={styles.detailValue}>
              {raca ?? "—"}
            </Text>
          </View>
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
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    marginTop: 12,
    gap: 8,
  },

  detailItem: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
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

  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor:
      colors.brand.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.accent,
  },
});