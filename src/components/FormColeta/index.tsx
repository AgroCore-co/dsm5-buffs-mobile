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




export const ColetaAddBottomSheet: React.FC<
  ColetaAddBottomSheetProps
> = ({ industrias, onSuccess, onClose, propriedadeId }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "70%"], []);

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
      enableDynamicSizing={false}
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
    sheetBackground: { backgroundColor: colors.bg.sheet, borderRadius: 24 },
    handleIndicator: { backgroundColor: colors.border.light, height: 4, width: 36 },

    // Container principal
    container: {
        paddingBottom: 32,
        backgroundColor: colors.bg.sheet,
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
        color: colors.text.heading,
    },
    sectionTitle: {
        fontWeight: "600",
        fontSize: 16,
        color: colors.text.heading,
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        paddingBottom: 4,
    },
    // Estilo base do input, usado pelo Floating Label
    inputBase: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        borderColor: colors.border.default,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text.heading,
        backgroundColor: colors.bg.card
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", // Deve ser visível para o dropdown
        zIndex: 10,
    },
    listContainerHeader: { 
        backgroundColor: colors.bg.card,
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
        color: colors.text.secondary,
        fontWeight: "500",
        flex: 1,
    },
    listLabelDropdown: { 
        fontSize: 16,
        color: colors.text.secondary,
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
        borderTopColor: colors.border.default,
    },
    dateDisplayButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border.default,
        backgroundColor: colors.bg.input,
    },
    dateDisplayValue: {
        fontSize: 16,
        color: colors.text.heading,
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
        borderColor: colors.border.default,
        backgroundColor: colors.bg.card,
        height: 50,
    },
    dropdownContainerStyle: {
        borderColor: colors.border.default,
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
        borderColor: colors.border.default,
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
        backgroundColor: colors.brand.primary,
    },
    saveText: {
        fontWeight: "700",
        color: colors.text.heading,
        fontSize: 16,
    },
    radioGroupContainer: {
        marginBottom: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
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
    borderColor: colors.text.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: colors.text.heading,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 4,
  },
});