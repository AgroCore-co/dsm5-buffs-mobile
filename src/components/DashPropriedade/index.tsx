import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import { ProducaoDiariaPoint } from "../../services/lactacaoService";

const SCREEN_W = Dimensions.get("window").width;
// Largura disponível dentro do card (padding 16 de cada lado + margens)
const CHART_W = SCREEN_W - 32 - 32;

interface DashPropriedadeProps {
  total: number;
  machos: number;
  femeas: number;
  bezerros: number;
  novilhas: number;
  vacas: number;
  touros: number;
  historicoLeite: ProducaoDiariaPoint[];
}

export default function DashPropriedade({
  total,
  machos,
  femeas,
  bezerros,
  novilhas,
  vacas,
  touros,
  historicoLeite,
}: DashPropriedadeProps) {
  // --- Dados para o gráfico de maturidade ---
  const maturidadeData = [
    { value: bezerros, label: "Bez.", frontColor: colors.brand.primary },
    { value: novilhas, label: "Nov.", frontColor: colors.status.warning },
    { value: vacas,    label: "Vac.", frontColor: colors.status.success },
    { value: touros,   label: "Tou.", frontColor: colors.status.error },
  ];

  // --- Dados para gráfico de linha (leite) ---
  const leiteData = historicoLeite.length > 0
    ? historicoLeite.map((p) => ({
        value: p.quantidade,
        label: p.label,
        dataPointText: p.quantidade > 0 ? String(p.quantidade) : "",
      }))
    : [{ value: 0, label: "" }];

  const maxLeite = Math.max(...leiteData.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      {/* Cabeçalho resumo */}
      <View style={styles.header}>
        <TextTitle>Resumo do Rebanho</TextTitle>
        <Text style={styles.subtitle}>{total} búfalos ativos</Text>
      </View>

      {/* Linha sexo */}
      <View style={styles.sexRow}>
        <View style={styles.sexCard}>
          <Text style={styles.sexValue}>{machos}</Text>
          <Text style={styles.sexLabel}>♂ Machos</Text>
        </View>
        <View style={styles.sexDivider} />
        <View style={styles.sexCard}>
          <Text style={styles.sexValue}>{femeas}</Text>
          <Text style={styles.sexLabel}>♀ Fêmeas</Text>
        </View>
      </View>

      {/* Gráfico maturidade */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Distribuição por Maturidade</Text>
      </View>

      <View style={styles.chartWrap}>
        <BarChart
          data={maturidadeData}
          width={CHART_W - 20}
          barWidth={36}
          spacing={20}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: colors.text.muted, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: colors.text.muted, fontSize: 11 }}
          noOfSections={4}
          maxValue={Math.max(bezerros, novilhas, vacas, touros, 1) + 2}
          isAnimated
          animationDuration={500}
          barBorderRadius={6}
        />
      </View>

      {/* Legenda maturidade */}
      <View style={styles.legend}>
        {[
          { label: "Bezerros", color: colors.brand.primary },
          { label: "Novilhas", color: colors.status.warning },
          { label: "Vacas",    color: colors.status.success },
          { label: "Touros",   color: colors.status.error },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Gráfico evolução do leite */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Estoque de Leite (L)</Text>
        {historicoLeite.length === 0 && (
          <Text style={styles.noData}>Sem registros ainda</Text>
        )}
      </View>

      {historicoLeite.length > 0 && (
        <View style={styles.chartWrap}>
          <LineChart
            data={leiteData}
            width={CHART_W - 20}
            height={140}
            spacing={Math.max(20, (CHART_W - 60) / leiteData.length)}
            color={colors.brand.primary}
            thickness={2}
            startFillColor={colors.brand.primary}
            endFillColor={colors.bg.card}
            startOpacity={0.3}
            endOpacity={0.02}
            areaChart
            hideDataPoints={leiteData.length > 10}
            dataPointsColor={colors.brand.primary}
            dataPointsRadius={4}
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
            xAxisLabelTextStyle={{
              color: colors.text.muted,
              fontSize: 9,
              width: 30,
              textAlign: "center",
            }}
            noOfSections={4}
            maxValue={maxLeite + Math.ceil(maxLeite * 0.1)}
            isAnimated
            animationDuration={600}
            curved
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
    zIndex: 1,
  },
  header: {
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
  sexRow: {
    flexDirection: "row",
    backgroundColor: colors.bg.section,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  sexCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  sexDivider: {
    width: 1,
    backgroundColor: colors.border.default,
    marginVertical: 10,
  },
  sexValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text.accent,
  },
  sexLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.accent,
  },
  noData: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  chartWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
