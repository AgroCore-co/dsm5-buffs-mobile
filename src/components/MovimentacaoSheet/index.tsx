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
import { ConfirmModal } from "../ModalStatus";

type MovimentacaoSheetProps = {
  grupo: Grupo;
  propriedadeId: string;
  loteAtualId?: string;
  /** Quando fornecido, filtra somente os lotes deste grupo (rodízio) */
  grupoId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const MovimentacaoSheet: React.FC<MovimentacaoSheetProps> = ({
  grupo,
  propriedadeId,
  loteAtualId,
  grupoId,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["55%", "80%"], []);
  const [lotes, setLotes] = useState<{ label: string; value: string }[]>([]);
  const [loteDestinoId, setLoteDestinoId] = useState<string | null>(null);
  const [loteDestinoNome, setLoteDestinoNome] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    piqueteService.getAll(propriedadeId).then((data) => {
      const lotesDisponiveis = data
        .filter((l) => {
          if (l.id === loteAtualId) return false;
          // Se grupoId fornecido, mostra só lotes deste grupo (rodízio)
          if (grupoId) return l.idGrupo === grupoId;
          return true;
        })
        .map((l) => ({ label: l.nome, value: l.id }));
      setLotes(lotesDisponiveis);
    });
  }, [propriedadeId, loteAtualId, grupoId]);

  const showFeedback = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const handlePressBotao = () => {
    if (!loteDestinoId) {
      showFeedback("Selecione o lote de destino.");
      return;
    }
    const nome = lotes.find((l) => l.value === loteDestinoId)?.label ?? loteDestinoId;
    setLoteDestinoNome(nome);
    setConfirmVisible(true);
  };

  const handleConfirmar = async () => {
    setConfirmVisible(false);
    setSubmitting(true);
    try {
      await movLoteService.create({
        idPropriedade: propriedadeId,
        idGrupo: grupo.id,
        idLoteAtual: loteDestinoId!,
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
    <>
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
          {lotes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Nenhum lote disponível para movimentação.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Lote de Destino</Text>
              <SelectBottomSheet
                items={lotes}
                value={loteDestinoId}
                onChange={setLoteDestinoId}
                title="Selecione o Lote"
                placeholder="Selecione o lote de destino"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.btn, (submitting || lotes.length === 0) && { opacity: 0.5 }]}
            onPress={handlePressBotao}
            disabled={submitting || lotes.length === 0}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.accent} />
            ) : (
              <Text style={styles.btnText}>Confirmar Movimentação</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>

      <ConfirmModal
        visible={confirmVisible}
        title="Confirmar Movimentação"
        message={`Mover o grupo "${grupo.nome}" para o lote "${loteDestinoNome}"?`}
        confirmText="Mover"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmar}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
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
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.placeholder,
    textAlign: "center",
  },
});
