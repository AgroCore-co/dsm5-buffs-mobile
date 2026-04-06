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
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";

// Importações do seu projeto (Ajuste os caminhos conforme necessário)
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal"; 
import YellowButton from "../Button";
import { registrarEstoqueApi, EstoqueRegistroPayload } from "../../services/lactacaoService"; 
// Importe o componente de Floating Label se ele estiver em um arquivo separado
// import { InputWithFloatingLabel } from "../InputWithFloatingLabel"; 

// ------------------------------------------------------------------
// --- PROPS E INTERFACES ---
// ------------------------------------------------------------------

interface EstoqueAddBottomSheetProps {
  onSuccess?: () => void;
  onClose: () => void;
  propriedadeId: string | number;
}
const defaultColors = {
    primary: { base: "#FAC638" },
    gray: { base: "#6B7280", claro: "#F8F7F5" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};

const mergedColors = { ...defaultColors, ...colors };

export const EstoqueAddBottomSheet: React.FC<
  EstoqueAddBottomSheetProps
> = ({ onSuccess, onClose, propriedadeId }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);
  const { user } = useAuth();
  console.log("Objeto completo do Usuário:", user);
  const userId = user?.id_usuario || null;
  // ESTADOS
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dtRegistro, setDtRegistro] = useState<string>(
    dayjs().format("YYYY-MM-DD")
  ); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Para desabilitar o botão

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
    if (isSaving) return;
    if (!userId) { 
        return showToast("ID do usuário não encontrado. Faça login novamente.", true); 
    } 
    if (!propriedadeId) { return showToast("ID da propriedade não encontrado.", true); }
    if (!quantidade || isNaN(parseFloat(quantidade)) || parseFloat(quantidade) <= 0) { 
        return showToast("Informe uma quantidade de estoque válida.", true); 
    }
    
    // 2. Montar Payload
    try {
      setIsSaving(true);
      
      // A API espera dt_registro como ISOString. 
      // Usamos a hora atual, mas a data selecionada.
      const dtRegistroISO = dayjs(dtRegistro).toISOString();
        console.log("userId:", userId);

      const payload: EstoqueRegistroPayload = {
        id_propriedade: String(propriedadeId), 
        id_usuario: userId, 
        quantidade: parseFloat(quantidade),
        dt_registro: dtRegistroISO,
        observacao: observacao || undefined,
      };
      
      // 3. Chamada à API
      await registrarEstoqueApi(payload);
      
      showToast("Estoque registrado com sucesso!");
      setIsSaving(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar estoque:", err);
      setIsSaving(false);
      showToast("Não foi possível registrar o estoque.", true);
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
          pressBehavior="none"
        />
      )}
    >
      <BottomSheetScrollView 
        contentContainerStyle={styles.container} 
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Atualizar Estoque de Leite</Text>
        </View>

        <Text style={styles.sectionTitle}>Detalhes do Estoque</Text>

        <View style={styles.listContainer}>
            {/* Quantidade (FLOATING LABEL) */}
            <Text style={styles.label}>Quantidade de Leite (Litros)</Text>
            <TextInput
                style={styles.inputBase}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                placeholder="Digite a quantidade de leite no estoque"/>
           
            {/* Data do Registro */}
            <View style={styles.dateFieldContainer}>
                <Text style={styles.listLabel}>Data Registro:</Text>
                <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateDisplayButton}
                >
                    <Text style={styles.dateDisplayValue}>
                        {dayjs(dtRegistro).format("DD/MM/YYYY")}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Observação (FLOATING LABEL e multiline) */}
            <Text style={styles.label}>Observações (Opcional)</Text>
            <TextInput
                style={styles.inputBase}
                value={observacao}
                onChangeText={setObservacao}
                multiline={true}
                placeholder="Digite as observações (opcional)"/>
        </View>  

        {/* Footer (Botão de ação) */}
        <View style={styles.footer}>
            <YellowButton 
                title={isSaving ? "Salvando..." : "Salvar no Estoque"} 
                onPress={handleSave} 
                disabled={isSaving}
            />
        </View>

        {/* Modal de Data */}
        <DatePickerModal
            visible={showDatePicker}
            date={dtRegistro}
            onClose={() => setShowDatePicker(false)}
            onSelectDate={(selected) =>
                setDtRegistro(dayjs(selected).format("YYYY-MM-DD"))
            }
        />
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
    // Estilo base do input, usado pelo Floating Label
    inputBase: {
        width: "100%",
        borderWidth: 1,
        borderColor: mergedColors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: mergedColors.text.primary,
        backgroundColor: mergedColors.white.base,
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", 
    },
    listLabel: {
        fontSize: 16,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        flex: 1,
    },
    
    // --- Campo de Data Intuitivo ---
    dateFieldContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: mergedColors.border,
    },
    dateDisplayButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.gray.claro,
    },
    dateDisplayValue: {
        fontSize: 16,
        color: mergedColors.text.primary,
        fontWeight: "600",
        marginRight: 8,
    },

    // --- Observação ---
    observacaoInput: {
        height: 120,
    },

    // --- Footer ---
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        padding: 16,
        borderTopWidth: 1,
        borderColor: mergedColors.border,
        marginTop: 16,
    },
    // Estilos do botão replicados do YellowButton (apenas para referência visual, 
    // a implementação usa o componente <YellowButton> real)
    footerBtn: {
        paddingHorizontal: 24,
        height: 50,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        width: '100%',
    },
    saveBtn: {
        backgroundColor: mergedColors.primary.base,
    },
    saveText: {
        fontWeight: "700",
        color: mergedColors.text.primary,
        fontSize: 16,
    },
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
});