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
import DropDownPicker from "react-native-dropdown-picker";
import dayjs from "dayjs";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

// Importações de componentes e serviços
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal"; 
import YellowButton from "../Button"; 
import { Industria, ColetaRegistroPayload, registrarColetaApi } from "../../services/lactacaoService"; 
import SelectBottomSheet from "../SelectBottomSheet";

// ------------------------------------------------------------------
// --- PROPS E INTERFACES ---
// ------------------------------------------------------------------

interface ColetaAddBottomSheetProps {
  industrias: Industria[]; // Lista de indústrias
  onSuccess?: () => void;
  onClose: () => void;
  propriedadeId: string | number; // O ID da propriedade (assumido string/number)
}


const defaultColors = {
    primary: { base: "#FAC638" }, 
    gray: { base: "#6B7280", claro: "#F8F7F5" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};
const mergedColors = { ...defaultColors, ...colors };

export const ColetaAddBottomSheet: React.FC<
  ColetaAddBottomSheetProps
> = ({ industrias, onSuccess, onClose, propriedadeId }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["65%", "90%"], []);

  // ESTADOS (Baseados no seu FormColeta)
  const [idIndustria, setIdIndustria] = useState<string | null>(null);
  const [openIndustria, setOpenIndustria] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [resultadoTeste, setResultadoTeste] = useState<boolean | null>(null);
  const [dtColeta, setDtColeta] = useState<string>(
    dayjs().format("YYYY-MM-DD")
  ); 
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    // 1. Validações
    if (!idIndustria) { return showToast("Selecione a indústria.", true); }
    if (!quantidade || isNaN(parseFloat(quantidade)) || parseFloat(quantidade) <= 0) { 
        return showToast("Informe uma quantidade coletada válida.", true); 
    }
    if (!propriedadeId) { return showToast("ID da propriedade não encontrado.", true); }
    if (resultadoTeste === null) { return showToast("Informe o resultado do teste.", true); }
    
    // 2. Montar Payload
    try {
      // API pede dt_coleta como ISOString com hora (dia atual, hora 00:00:00Z)
      const dtColetaISO = dayjs(dtColeta).toISOString();

      const payload: ColetaRegistroPayload = {
        idIndustria: idIndustria,
        idPropriedade: String(propriedadeId), // Converter para string/UUID
        resultadoTeste: resultadoTeste,
        observacao: observacao || undefined,
        quantidade: parseFloat(quantidade),
        dtColeta: dtColetaISO,
      };
      
      // 3. Chamada à API
      await registrarColetaApi(payload);
      
      showToast("Coleta registrada com sucesso!");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar coleta:", err);
      showToast("Não foi possível registrar a coleta.", true);
    }
  };

  // Mapeamento das indústrias para o DropDownPicker
  const industriaItems = useMemo(() => industrias.map(i => ({
    label: i.nome,
    value: i.id_industria,
  })), [industrias]);


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
        scrollEnabled={!openIndustria} 
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Registro de Coleta</Text>
        </View>

        <Text style={styles.sectionTitle}>Dados da Coleta</Text>

        <View style={styles.listContainer}>
          <View style={{ marginBottom: 12 }}>
            {/* Dropdown de Indústrias */}
            <Text style={styles.label}>Indústria:</Text>
            <SelectBottomSheet
                items={industriaItems}
                value={idIndustria}
                onChange={(value) => setIdIndustria(value)}
                title="Selecionar Industria"
                placeholder="Selecione uma indústria"
                />
          </View>
            
            {/* Quantidade */}
            <Text style={styles.label}>Quantidade Coletada (L)</Text>
            <TextInput
                style={styles.inputBase}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                placeholder="Digite a quantidade coletada (L)"/>
            
            {/* Data da Coleta */}
            <View style={styles.dateFieldContainer}>
                <Text style={styles.label}>Data Coleta:</Text>
                <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateDisplayButton}
                >
                    <Text style={styles.dateDisplayValue}>
                        {dayjs(dtColeta).format("DD/MM/YYYY")}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Resultado do Teste (RÁDIO BUTTONS) */}
            <View style={styles.radioGroupContainer}>
                <Text style={styles.label}>Resultado do Teste:</Text>
                <View style={styles.radioGroupRow}>
                    {[
                        { label: 'Aprovado', value: true },
                        { label: 'Reprovado', value: false },
                    ].map((item) => (
                        <TouchableOpacity
                            key={String(item.value)}
                            onPress={() => setResultadoTeste(item.value)}
                            style={styles.radioItem}
                        >
                            <View style={styles.radioCircle}>
                                {resultadoTeste === item.value && (
                                    <View style={styles.radioSelected} />
                                )}
                            </View>
                            <Text style={styles.radioLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Observação */}
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
            <YellowButton title="Registrar Coleta" onPress={handleSave} />
        </View>

        {/* Modal de Data */}
        <DatePickerModal
            visible={showDatePicker}
            date={dtColeta}
            onClose={() => setShowDatePicker(false)}
            onSelectDate={(selected) =>
                setDtColeta(dayjs(selected).format("YYYY-MM-DD"))
            }
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ------------------------------------------------------------------
// --- ESTILOS UNIFICADOS (Manter os estilos do LactacaoAddBottomSheet) ---
// ------------------------------------------------------------------

// OBS: Os estilos devem ser consistentes com o LactacaoAddBottomSheet.
// Usarei os mesmos estilos que foram definidos anteriormente.

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
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        borderColor: mergedColors.border,
        paddingHorizontal: 12,
        fontSize: 16,
        color: mergedColors.text.primary,
        backgroundColor: mergedColors.white.base
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", // Deve ser visível para o dropdown
        zIndex: 10,
    },
    listContainerHeader: { 
        backgroundColor: mergedColors.white.base,
        borderRadius: 8,
        marginHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 12,
    },
    listLabel: {
        fontSize: 16,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        flex: 1,
    },
    listLabelDropdown: { 
        fontSize: 16,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginRight: 10,
    },
    
    // --- Campo de Data/Info ---
    dateFieldContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        marginVertical: 12,
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
    },

    // --- Dropdown ---
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        zIndex: 3000, // ZIndex alto para garantir que o dropdown fique por cima
    },
    dropdownStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
        height: 50,
    },
    dropdownContainerStyle: {
        borderColor: mergedColors.border,
    },
    observacaoInput: {
        height: 120,
        marginTop: 12, 
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        padding: 16,
        borderTopWidth: 1,
        borderColor: mergedColors.border,
        marginTop: 16,
    },
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
    radioGroupContainer: {
        marginBottom: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: mergedColors.border, 
    },
  // Estilos de Radio Button (Ajustados para melhor visualização)
  radioGroupRow: {
    flexDirection: "row", 
    marginBottom: 12,
    marginTop: 8,
    justifyContent: "space-between",
  },
  radioItem: {
    flexDirection: "row", 
    alignItems: "center",
    paddingVertical: 8,
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray.base,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FAC638", 
  },
  radioLabel: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    color: mergedColors.text.secondary,
    fontWeight: "600",
    marginBottom: 4,
  },
});