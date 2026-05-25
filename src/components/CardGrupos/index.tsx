import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { colors } from "../../styles/colors";
import IconBuffs from '../../icons/agroCore';

interface CardGrupoProps {
  nome: string;
  piquete?: string;
  quantidade?: number;
  ocupacao?: number;
  color?: string;
  onPress?: () => void;
}

export const CardGrupo = ({
  nome,
  piquete,
  quantidade = 0,
  ocupacao = 0,
  color = colors.brand.primary,
  onPress,
}: CardGrupoProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
    <View style={styles.statusBar}>
      <View style={styles.iconWrapper}>
        <IconBuffs
          width={24}
          height={24}
          fill={color}
        />
      </View>
    </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.title}>
              {nome}
            </Text>

            <Text style={styles.location}>
              Localização: {piquete || "Sem localização"}
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {quantidade} Cabeças
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressHeader}>
            <Text style={styles.label}>
              Ocupação
            </Text>

            <Text style={styles.percent}>
              {ocupacao}%
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${ocupacao}%`,
                  backgroundColor:
                    colors.brand.primary,
                },
              ]}
            />
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

  statusBar: {
    width: 58,
    alignItems: "center",
    justifyContent: "center",
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

  location: {
    marginTop: 3,
    fontSize: 12,
    color: colors.text.secondary,
  },

  badge: {
    backgroundColor: colors.brand.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.accent,
  },

  footer: {
    marginTop: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: 10
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 11,
    color: colors.text.secondary,
  },

  percent: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.accent,
  },

  progressBackground: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.brand.warningFade,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});