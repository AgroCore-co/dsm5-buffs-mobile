import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform as RNPlatform,
  ToastAndroid,
  Alert,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DropDownPicker from "react-native-dropdown-picker";
import "dayjs/locale/pt-br"; 
import { usePropriedade } from "../../context/PropriedadeContext";
import { colors } from "../../styles/colors";
import { updateReproducao, ReproducaoUpdatePayload, createCicloLactacao, registrarParto } from "../../services/reproducaoService";
import YellowButton from "../Button";
import SelectBottomSheet from "../SelectBottomSheet";

// Configuração de cores (Inalterado)
const defaultColors = {
    primary: { base: "#FAC638" }, 
    gray: { base: "#6B7280", claro: "#F8F7F5", disabled: "#E5E7EB" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" },
    red: { base: "#EF4444" }
};
const mergedColors = { ...defaultColors, ...colors };

interface ReproducaoAttBottomSheetProps {
  initialData: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReproducaoAttBottomSheet: React.FC<
  ReproducaoAttBottomSheetProps
> = ({ initialData, onClose, onSuccess }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%", "60%"], []); 
  const { propriedadeSelecionada } = usePropriedade();
  const [form, setForm] = useState({
    status: initialData?.status || "",
    tipo_parto: initialData?.tipo_parto || "",
  });

  const [openStatus, setOpenStatus] = useState(false);
  const [openParto, setOpenParto] = useState(false);
  
  const zIndexStatus = openStatus ? 200 : 100;
  const zIndexParto = openParto ? 200 : 90;

  // Mapeamentos para DropDownPicker (Inalterado)
  const statusItems = useMemo(() => [
    { label: "Em andamento", value: "Em andamento" },
    { label: "Confirmada (Prenha)", value: "Confirmada" },
    { label: "Concluída (Parto)", value: "Concluida" },
    { label: "Falhou", value: "Falhou" },
  ], []);


  const partoItems = useMemo(() => [
    { label: "Normal", value: "Normal" },
    { label: "Cesárea", value: "Cesárea" },
    { label: "Aborto", value: "Aborto" },
  ], []);

  const handleChange = (field: "status" | "tipo_parto", value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );
  
  const showToast = (message: string, isError: boolean = false) => {
    if (RNPlatform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert(isError ? "Erro" : "Sucesso", message);
    }
  };


  const handleSave = async () => {
    if (!propriedadeSelecionada) {
      return showToast("Propriedade não selecionada.", true);
    }

    const reproducaoId = initialData.id;

    if (form.status === "Concluida" && !form.tipo_parto) {
      return showToast(
        "Para concluir a reprodução, o tipo de parto é obrigatório.",
        true
      );
    }

    try {
      // 🟢 CONCLUIR (PARTO)
      if (form.status === "Concluida") {
        const dtParto = new Date().toISOString().split("T")[0];

        await registrarParto(reproducaoId, {
          dt_parto: dtParto,
          tipo_parto: form.tipo_parto,
          observacao: "Parto registrado via aplicativo",
          criar_ciclo_lactacao: true,
          padrao_dias_lactacao: 305,
        });

        showToast("Parto registrado com sucesso!");
        onSuccess();
        onClose();
        return;
      }

      await updateReproducao(reproducaoId, {
        status: form.status,
      });

      showToast("Reprodução atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar reprodução:", error);
      showToast(
        error?.message || "Erro ao atualizar reprodução.",
        true
      );
    }
  };



  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={true}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close" 
        />
      )}
    >
      <BottomSheetScrollView 
        contentContainerStyle={styles.container} 
        scrollEnabled={!openStatus && !openParto}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Atualizar Reprodução</Text>
        </View>

        <Text style={styles.sectionTitle}>Detalhes</Text>

        <View style={styles.listContainer}>
            
            {/* Campo Não Editável: Data do Evento */}
            <Text style={styles.label}>Data do Evento</Text>
            <TextInput
                style={[styles.inputBase, styles.inputDisabled]}
                value={initialData?.dtEvento || "-"}
                onChangeText={() => {}}
                editable={false}/>
         
            {/* Dropdown Status (Inalterado) */}
            <View style={{ zIndex: zIndexStatus, marginBottom: 12 }}>
                <Text style={styles.label}>Status:</Text>
                <SelectBottomSheet
                    items={statusItems}
                    value={form.status}
                    onChange={(val: any) => handleChange("status", val)}
                    title="Selecione o Status"
                    placeholder="Selecione o Status"
                />
            </View>

            {/* Dropdown Tipo de Parto (Removida a lógica de desabilitação) */}
            <View style={{ zIndex: zIndexParto, marginBottom: 12 }}>
                <Text style={styles.label}>Tipo Parto:</Text>
                <SelectBottomSheet
                    items={partoItems}
                    value={form.tipo_parto}
                    onChange={(val: any) => handleChange("tipo_parto", val)}
                    title="Selecione o Tipo de Parto"
                    placeholder="Selecione o Tipo de Parto"
                />
            </View>
            
        </View>  

        {/* Footer (Inalterado) */}
        <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <YellowButton title="Salvar" onPress={handleSave} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};


const styles = StyleSheet.create({
    // Estilos do BottomSheet
    sheetBackground: { backgroundColor: mergedColors.gray.claro, borderRadius: 24 },
    handleIndicator: { backgroundColor: "#D1D5DB", height: 4, width: 36 },

    // Container principal
    container: {
        paddingBottom: 32,
        backgroundColor: mergedColors.gray.claro,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "700",
        color: mergedColors.text.primary,
    },
    sectionTitle: {
        fontWeight: "600",
        fontSize: 16,
        color: mergedColors.text.primary,
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: mergedColors.border,
        paddingBottom: 4,
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", 
        zIndex: 100, 
    },
    
    // --- Estilos do Dropdown (Padrão) ---
    dropdownLabel: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginBottom: 4,
    },
    dropdownStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
        height: 50,
    },
    dropdownContainerStyle: { 
        borderColor: mergedColors.border,
    },
    
    // --- Footer ---
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: mergedColors.border,
        marginTop: 16,
    },
    cancelButton: { 
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    cancelText: { 
        color: mergedColors.red.base, 
        fontWeight: "bold",
        fontSize: 16,
    },
    label: {
      fontSize: 14,
      color: mergedColors.text.secondary,
      fontWeight: "600",
      marginBottom: 4,
    },
    inputBase: {
      height: 50,
      borderWidth: 1,
      borderRadius: 12,
      justifyContent: "center",
      borderColor: mergedColors.border,
      paddingHorizontal: 12,
      fontSize: 16,
      color: mergedColors.text.primary,
      backgroundColor: mergedColors.white.base,
      marginBottom: 12
    },
    inputDisabled: {
        backgroundColor: "#f5f5f5",
        color: "#777",
    },  
});