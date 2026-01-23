import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
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
import { updateReproducao, ReproducaoUpdatePayload, createCicloLactacao } from "../../services/reproducaoService";
import YellowButton from "../Button";

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

// ==========================================================
// --- FLOATING LABEL INPUT COMPONENT (Inalterado) ---
// ==========================================================

interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    editable?: boolean;
    style?: any; 
}

const floatingStyles = StyleSheet.create({
    inputContainer: {
        marginBottom: 12, 
        paddingTop: 8, 
        position: "relative",
    },
    label: {
        position: "absolute",
        left: 12,
        backgroundColor: mergedColors.white.base, 
        paddingHorizontal: 4,
        zIndex: 1,
        fontWeight: "400",
    },
    inputBase: {
        width: "100%",
        borderWidth: 1,
        borderColor: mergedColors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: mergedColors.text.primary,
        backgroundColor: mergedColors.white.base,
        height: 50, 
        paddingTop: 15,
        textAlignVertical: 'center',
    },
});

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label,
    value,
    onChangeText,
    editable = true,
    style,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(value ? 1 : 0)).current; 

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(focusAnim, { toValue: 1, duration: 200, easing: Easing.bezier(0.4, 0.0, 0.2, 1), useNativeDriver: false }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!value) {
            Animated.timing(focusAnim, { toValue: 0, duration: 200, easing: Easing.bezier(0.4, 0.0, 0.2, 1), useNativeDriver: false }).start();
        }
    };
    
    useEffect(() => {
        Animated.timing(focusAnim, { toValue: value ? 1 : 0, duration: 200, easing: Easing.bezier(0.4, 0.0, 0.2, 1), useNativeDriver: false }).start();
    }, [value]);

    const labelStyle = {
        top: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [18, -12], 
        }),
        fontSize: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [mergedColors.gray.base, isFocused ? mergedColors.primary.base : mergedColors.gray.base], 
        }),
    };

    const borderColor = isFocused ? mergedColors.primary.base : mergedColors.border;
    const backgroundColor = editable ? mergedColors.white.base : mergedColors.gray.claro;
    
    return (
        <View style={[floatingStyles.inputContainer, style]}>
            <Animated.Text style={[floatingStyles.label, labelStyle]}>
                {label}
            </Animated.Text>
            <TextInput
                style={[
                    floatingStyles.inputBase, 
                    { 
                        borderColor: borderColor, 
                        backgroundColor: backgroundColor,
                        color: editable ? mergedColors.text.primary : mergedColors.gray.base,
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={editable}
                placeholderTextColor="transparent"
            />
        </View>
    );
};

// ==========================================================
// --- COMPONENTE PRINCIPAL (BOTTOM SHEET) ---
// ==========================================================

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
    { label: "Falha", value: "Falha" },
    { label: "Confirmada, está em prenha", value: "Confirmada" },
    { label: "Concluída, nasceu", value: "Concluída" },
  ], []);

  const partoItems = useMemo(() => [
    { label: "Normal", value: "Normal" },
    { label: "Cesárea", value: "Cesárea" },
    { label: "Aborto", value: "Aborto" },
  ], []);

  // ⚠️ Removida a variável isTipoPartoDisabled

  const handleChange = (field: "status" | "tipo_parto", value: string) => {
    // ⚠️ Removida a lógica de limpeza/cheque de regra de negócio
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
        return showToast("Se o status for 'Concluída', o Tipo de Parto é obrigatório.", true);
    }
    
    // Payload tipado
    const payload: ReproducaoUpdatePayload = {
      status: form.status,
      tipo_parto: form.status === "Concluida" ? form.tipo_parto : null,
    };

    try {
      await updateReproducao(reproducaoId, payload);
      showToast("Reprodução atualizada com sucesso!");
      if (form.status === "Concluida") {
        const dtParto = new Date().toISOString().split("T")[0];
        const lactacaoPayload = {
            id_bufala: initialData.id_bufala,      // UUID da Búfala (deve vir no initialData)
            id_propriedade: propriedadeSelecionada, // UUID da Propriedade
            dt_parto: dtParto,
            padrao_dias: 305, 
            observacao: `Parto registrado: ${form.tipo_parto}. Reprodução ID: ${initialData.id}`,
        };
        console.log("PAYLOAD CICLO LACTAÇÃO ENVIADO:", JSON.stringify(lactacaoPayload, null, 2));

        await createCicloLactacao(lactacaoPayload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      // ⚠️ Tratamento de erro simplificado, apenas exibindo uma mensagem genérica
      // (a API ainda pode retornar erros de regra de negócio, mas o componente não os tratará especificamente)
      const errorMessage = error?.message || "Não foi possível atualizar a reprodução. Verifique os dados.";
      console.error("Erro ao salvar:", error);
      showToast(errorMessage, true);
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
            <InputWithFloatingLabel
                label="Data do Evento"
                value={initialData?.dt_evento || "-"}
                onChangeText={() => {}}
                editable={false}
            />
            
            {/* Dropdown Status (Inalterado) */}
            <View style={{ zIndex: zIndexStatus, marginBottom: 12 }}>
                <Text style={styles.dropdownLabel}>Status:</Text>
                <DropDownPicker
                    open={openStatus}
                    value={form.status}
                    items={statusItems}
                    setOpen={setOpenStatus}
                    setValue={(val: any) => handleChange("status", val())}
                    placeholder="Selecione o Status"
                    style={styles.dropdownStyle}
                    containerStyle={styles.dropdownContainerStyle} 
                    dropDownContainerStyle={styles.dropdownContainerStyle}
                    listMode="SCROLLVIEW"
                />
            </View>

            {/* Dropdown Tipo de Parto (Removida a lógica de desabilitação) */}
            <View style={{ zIndex: zIndexParto, marginBottom: 12 }}>
                <Text style={styles.dropdownLabel}>Tipo Parto:</Text>
                <DropDownPicker
                    open={openParto}
                    value={form.tipo_parto}
                    items={partoItems}
                    setOpen={setOpenParto}
                    setValue={(val: any) => handleChange("tipo_parto", val())}
                    placeholder="Selecione o Tipo de Parto"
                    style={styles.dropdownStyle}
                    containerStyle={styles.dropdownContainerStyle} 
                    dropDownContainerStyle={styles.dropdownContainerStyle}
                    listMode="SCROLLVIEW"
                    // ⚠️ Removido o disabled={isTipoPartoDisabled}
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
});