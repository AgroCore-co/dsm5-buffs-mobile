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

// ------------------------------------------------------------------
// --- PROPS E INTERFACES ---
// ------------------------------------------------------------------

interface ColetaAddBottomSheetProps {
  industrias: Industria[]; // Lista de indústrias
  onSuccess?: () => void;
  onClose: () => void;
  propriedadeId: string | number; // O ID da propriedade (assumido string/number)
}

interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
    multiline?: boolean;
    style?: any; 
}

const defaultColors = {
    primary: { base: "#FAC638" }, 
    gray: { base: "#6B7280", claro: "#F8F7F5" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};
const mergedColors = { ...defaultColors, ...colors };

const floatingStyles = StyleSheet.create({
    inputContainer: {
        marginBottom: 12, 
        paddingTop: 8, 
        position: "relative",
    },
    inputContainerMultiline: {
        height: 120, 
    },
    label: {
        position: "absolute",
        left: 12,
        backgroundColor: mergedColors.white.base, 
        paddingHorizontal: 4,
        zIndex: 1,
        fontWeight: "400",
    },
});
// --------------------------------------------------

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label,
    value,
    onChangeText,
    keyboardType = "default",
    multiline = false,
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
            outputRange: ["#6B7280", isFocused ? (mergedColors.primary.base || "#FAC638") : "#6B7280"], 
        }),
    };

    const borderColor = isFocused ? (mergedColors.primary.base || "#FAC638") : (mergedColors.border || "#E5E7EB");
    
    return (
        <View style={[floatingStyles.inputContainer, multiline && floatingStyles.inputContainerMultiline, style]}>
            <Animated.Text style={[floatingStyles.label, labelStyle]}>
                {label}
            </Animated.Text>
            <TextInput
                style={[
                    styles.inputBase, 
                    { 
                        borderColor: borderColor, 
                        height: multiline ? 100 : 50, 
                        paddingTop: multiline ? 12 : 15,
                        textAlignVertical: multiline ? 'top' : 'center',
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                onFocus={handleFocus}
                onBlur={handleBlur}
                multiline={multiline}
                placeholderTextColor="transparent"
            />
        </View>
    );
};
// ------------------------------------------------------------------

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
        id_industria: idIndustria,
        id_propriedade: String(propriedadeId), // Converter para string/UUID
        resultado_teste: resultadoTeste,
        observacao: observacao || undefined,
        quantidade: parseFloat(quantidade),
        dt_coleta: dtColetaISO,
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
            {/* Dropdown de Indústrias */}
            <View style={styles.dropdownItem}>
                <Text style={styles.listLabelDropdown}>Indústria:</Text>
                <DropDownPicker
                    open={openIndustria}
                    value={idIndustria}
                    items={industriaItems}
                    setOpen={setOpenIndustria}
                    setValue={setIdIndustria}
                    placeholder="Selecione a Indústria"
                    style={styles.dropdownStyle}
                    containerStyle={{ flex: 1, zIndex: 3000 }} 
                    listMode="SCROLLVIEW"
                    dropDownContainerStyle={styles.dropdownContainerStyle}
                />
            </View>
            
            {/* Quantidade */}
            <InputWithFloatingLabel
                label="Quantidade Coletada (L)"
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
            />
            
            {/* Data da Coleta */}
            <View style={styles.dateFieldContainer}>
                <Text style={styles.listLabel}>Data Coleta:</Text>
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
                <Text style={styles.listLabel}>Resultado do Teste:</Text>
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
            <InputWithFloatingLabel
                label="Observações (Opcional)"
                value={observacao}
                onChangeText={setObservacao}
                multiline={true}
                style={styles.observacaoInput}
            />

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
});