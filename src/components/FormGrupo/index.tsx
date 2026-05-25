import React, { useRef, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Alert, ToastAndroid, ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { grupoService, Grupo, NovoGrupoDTO } from "../../services/grupoService";

const SWATCHES = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

type FormGrupoProps = {
  propriedadeId: string;
  grupo?: Grupo;
  onClose: () => void;
  onSuccess: () => void;
};

export const FormGrupo: React.FC<FormGrupoProps> = ({
  propriedadeId,
  grupo,
  onClose,
  onSuccess,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "70%"], []);
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [cor, setCor] = useState(grupo?.color ?? SWATCHES[0]);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!grupo;

  const showFeedback = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      showFeedback("Informe o nome do grupo.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && grupo) {
        await grupoService.update(grupo.id, { nomeGrupo: nome.trim(), color: cor });
      } else {
        const dto: NovoGrupoDTO = {
          nomeGrupo: nome.trim(),
          idPropriedade: propriedadeId,
          color: cor,
        };
        await grupoService.create(dto);
      }
      showFeedback(isEdit ? "Grupo atualizado!" : "Grupo criado!");
      onSuccess();
      onClose();
    } catch (err: any) {
      showFeedback(err?.message || "Erro ao salvar grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? "Editar Grupo" : "Novo Grupo"}</Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome do Grupo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Grupo de Recria"
          placeholderTextColor={colors.text.placeholder}
          maxLength={50}
        />

        <Text style={styles.label}>Cor de Identificação</Text>
        <View style={styles.swatches}>
          {SWATCHES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.swatch, { backgroundColor: c }, cor === c && styles.swatchSelected]}
              onPress={() => setCor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          onPress={handleSalvar}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.accent} />
          ) : (
            <Text style={styles.btnText}>{isEdit ? "Salvar Alterações" : "Criar Grupo"}</Text>
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
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text.heading,
    backgroundColor: colors.bg.card,
    marginBottom: 16,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.text.heading,
  },
  btn: {
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
