import React, { useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { Piquete } from "../../services/piqueteService";
import { MapLeaflet } from "../Mapa";

type LoteDetailSheetProps = {
  lote: Piquete;
  onClose: () => void;
  onMoverGrupo?: () => void;
};

export const LoteDetailSheet: React.FC<LoteDetailSheetProps> = ({
  lote,
  onClose,
  onMoverGrupo,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "70%"], []);

  const temGeometria = lote.coords && lote.coords.length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onClose={onClose}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{lote.nome}</Text>
        <View style={[styles.statusDot, { backgroundColor: lote.idGrupo ? (lote.grupoCor || colors.brand.dark) : colors.border.muted }]} />
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Grupo</Text>
            <Text style={styles.infoValue}>{lote.idGrupo ? lote.grupoNome : "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{lote.status || "ativo"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Área</Text>
            <Text style={styles.infoValue}>
              {lote.areaM2 ? `${(lote.areaM2 / 10000).toFixed(1)} ha` : "—"}
            </Text>
          </View>
        </View>

        {temGeometria && (
          <View style={styles.mapContainer}>
            <MapLeaflet
              piquetes={[lote]}
              currentLocation={null}
            />
          </View>
        )}

        {lote.idGrupo && onMoverGrupo && (
          <TouchableOpacity style={styles.moverBtn} onPress={onMoverGrupo}>
            <Text style={styles.moverBtnText}>Mover Grupo para outro Lote</Text>
          </TouchableOpacity>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.subtle,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: colors.bg.section,
    borderRadius: 12,
    padding: 12,
  },
  infoItem: {
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.title,
    fontWeight: "600",
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
  },
  moverBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  moverBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
