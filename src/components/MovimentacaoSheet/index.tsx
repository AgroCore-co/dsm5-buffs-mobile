import React, { useRef, useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Alert, ToastAndroid, ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { Grupo } from "../../services/grupoService";
import { piqueteService } from "../../services/piqueteService";
import { movLoteService } from "../../services/movLoteService";
import SelectBottomSheet from "../SelectBottomSheet";

type MovimentacaoSheetProps = {
  grupo: Grupo;
  propriedadeId: string;
  loteAtualId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const MovimentacaoSheet: React.FC<MovimentacaoSheetProps> = ({
  grupo,
  propriedadeId,
  loteAtualId,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);
  const [lotes, setLotes] = useState<{ label: string; value: string }[]>([]);
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    piqueteService.getAll(propriedadeId).then((data) => {
      const lotesDisponiveis = data
        .filter((l) => l.id !== loteAtualId)
        .map((l) => ({ label: l.nome, value: l.id }));
      setLotes(lotesDisponiveis);
    });
  }, [propriedadeId, loteAtualId]);

  const showFeedback = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const handleConfirmar = async () => {
    if (!loteDestinoId) {
      showFeedback("Selecione o lote de destino.");
      return;
    }

    setSubmitting(true);
    try {
      await movLoteService.create({
        idPropriedade: propriedadeId,
        idGrupo: grupo.id,
        idLoteAtual: loteDestinoId,
        dtEntrada: new Date().toISOString(),
      });
      showFeedback("Grupo movido com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      showFeedback(err?.message || "Erro ao mover grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mover Grupo</Text>
        <Text style={styles.subtitle}>{grupo.nome}</Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Lote de Destino</Text>
        <SelectBottomSheet
          items={lotes}
          value={loteDestinoId}
          onChange={setLoteDestinoId}
          title="Selecione o Lote"
          placeholder="Selecione o lote de destino"
        />

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          onPress={handleConfirmar}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.accent} />
          ) : (
            <Text style={styles.btnText}>Confirmar Movimentação</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.subtle,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.accent,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.accent,
  },
});
