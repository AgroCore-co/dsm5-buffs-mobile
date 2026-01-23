import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform as RNPlatform,
  ToastAndroid,
  Alert
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import dayjs from "dayjs";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal"; 
import YellowButton from "../Button"; 
import { LactacaoRegistroPayload, registrarLactacaoApi } from "../../services/lactacaoService";

interface LactacaoPayload {
  id_bufala: string;
  qt_ordenha: number;
  periodo: string; // "M" ou "T"
  ocorrencia: string;
  dt_ordenha: string; // ISOString
}

interface LactacaoAddBottomSheetProps {
  animais: { id_bufala: string; brinco: string; id_ciclo_lactacao: string;}[];
  onSuccess?: () => void;
  onClose: () => void;
  propriedadeId: any;
}

// ------------------------------------------------------------------
// --- Componente de Input com Floating Label (REPLICADO) ---
// ------------------------------------------------------------------
interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
    multiline?: boolean;
    style?: any; 
}

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
            // Usando a cor de destaque amarela
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
// --- Fim Componente de Input com Floating Label ---
// ------------------------------------------------------------------


export const LactacaoAddBottomSheet: React.FC<
  LactacaoAddBottomSheetProps
> = ({ animais, onSuccess, onClose, propriedadeId }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);

  const [qtOrdenha, setQtOrdenha] = useState("");
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [openPeriodo, setOpenPeriodo] = useState(false);
  const [ocorrencia, setOcorrencia] = useState("");
  const [dtOrdenha, setDtOrdenha] = useState<string>(
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
    if (!qtOrdenha || isNaN(parseFloat(qtOrdenha))) {
      showToast("Informe uma quantidade de ordenha válida.", true);
      return;
    }
    if (!periodo) {
      showToast("Selecione o período da ordenha.", true);
      return;
    }
    if (!animais[0]?.id_bufala) {
      showToast("ID da búfala não encontrado.", true);
      return;
    }
    const idCicloLactacao = animais[0]?.id_ciclo_lactacao;
    
    if (!idCicloLactacao) {
      showToast("Ciclo de lactação não encontrado. Tente recarregar a tela.", true);
      return;
    }

    try {
          const payload: LactacaoRegistroPayload = {
            id_bufala: animais[0].id_bufala,
            id_propriedade: propriedadeId, 
            id_ciclo_lactacao: idCicloLactacao, 
            qt_ordenha: parseFloat(qtOrdenha),
            periodo,
            ocorrencia: ocorrencia || "",
            dt_ordenha: dayjs(dtOrdenha).toISOString(), 
          };

          // 🛑 SUBSTITUIR FUNÇÃO SIMULADA PELA REAL:
          await registrarLactacaoApi(payload); 
          
          showToast("Lactação registrada com sucesso!");
          onSuccess?.();
          onClose();
        } catch (err) {
      console.error("Erro ao salvar lactação:", err);
      showToast("Não foi possível registrar a lactação.", true);
    }
  };


  function handleChange(arg0: string, arg1: string): void {
    throw new Error("Function not implemented.");
  }

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
        scrollEnabled={!openPeriodo} // Desabilita o scroll ao abrir o dropdown
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Novo Registro de Lactação</Text>
        </View>

        {/* Informação da Búfala */}
        <View style={styles.listContainerHeader}>
            <Text style={styles.listLabel}>Búfala:</Text>
            <Text style={styles.dateDisplayValue}>
                {animais[0].brinco}
            </Text>
        </View>

        <Text style={styles.sectionTitle}>Detalhes da Ordenha</Text>

        <View style={styles.listContainer}>
            {/* Quantidade de Ordenha (FLOATING LABEL) */}
            <InputWithFloatingLabel
                label="Quantidade de Ordenha (L)"
                value={qtOrdenha}
                onChangeText={setQtOrdenha}
                keyboardType="numeric"
            />

          {/* Período */}
          <View style={styles.radioGroupContainer}>
              <Text style={styles.listLabel}>Período:</Text>
              <View style={styles.radioGroupRow}>
                  {[
                      { label: 'Manhã', value: 'M' },
                      { label: 'Tarde', value: 'T' },
                  ].map((item) => (
                      <TouchableOpacity
                          key={item.value}
                          onPress={() => setPeriodo(item.value)} // Usando setPeriodo
                          style={styles.radioItem}
                      >
                          <View style={styles.radioCircle}>
                              {periodo === item.value && (
                                  <View style={styles.radioSelected} />
                              )}
                          </View>
                          <Text style={styles.radioLabel}>{item.label}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
          </View>
  

            {/* Data da Ordenha (NOVO DESIGN DE DATA) */}
            <View style={styles.dateFieldContainer}>
                <Text style={styles.listLabel}>Data Ordenha:</Text>
                <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateDisplayButton}
                >
                    <Text style={styles.dateDisplayValue}>
                        {dayjs(dtOrdenha).format("DD/MM/YYYY")}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Ocorrência (FLOATING LABEL e multiline) */}
            <InputWithFloatingLabel
                label="Ocorrência (Opcional)"
                value={ocorrencia}
                onChangeText={setOcorrencia}
                multiline={true}
                style={styles.observacaoInput}
            />

        </View>  

        {/* Footer (Botão de ação) */}
        <View style={styles.footer}>
            <YellowButton title="Registrar Lactação" onPress={handleSave} />
        </View>

        {/* Modal de Data */}
        <DatePickerModal
            visible={showDatePicker}
            date={dtOrdenha}
            onClose={() => setShowDatePicker(false)}
            onSelectDate={(selected) =>
                setDtOrdenha(dayjs(selected).format("YYYY-MM-DD"))
            }
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ------------------------------------------------------------------
// --- ESTILOS UNIFICADOS (COPIADOS DO SANITARIO) ---
// ------------------------------------------------------------------

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
        backgroundColor: "#FFFFFF", 
        paddingHorizontal: 4,
        zIndex: 1,
        fontWeight: "400",
    },
});

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
        overflow: "hidden",
    },
    listContainerHeader: { // Para o item de informação (Búfala)
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
    listLabelDropdown: { // Para o label ao lado do DropdownPicker
        fontSize: 16,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginRight: 10,
    },
    
    // --- Campo de Data/Info (Data Ordenha) ---
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
        zIndex: 1000, 
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
        borderTopWidth: 1, // Adiciona separador acima, se necessário (ou remova)
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
    flexDirection: "row", // Para alinhar círculo e label
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
    backgroundColor: "#FAC638", // Cor de destaque para o selecionado
  },
  radioLabel: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
});