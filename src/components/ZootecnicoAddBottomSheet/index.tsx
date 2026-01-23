import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    Animated,
    Easing,
    Platform,
    ToastAndroid,
    Alert,
    ActivityIndicator // Adicionado para simular o loading no save
} from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal";
import dayjs from "dayjs";
import YellowButton from "../Button"; // Assumindo que o YellowButton é o componente de botão padrão

// ==========================================================
// --- CONFIGURAÇÃO DE CORES (Padrão Unificado) ---
// ==========================================================
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
// --- INTERFACES E DADOS ---
// ==========================================================
interface ZootecnicoPayload {
    peso?: number;
    condicao_corporal?: number;
    cor_pelagem?: string;
    formato_chifre?: string;
    porte_corporal?: string;
    dt_registro: string;
    tipo_pesagem?: string;
}

interface ZootecnicoAddBottomSheetProps {
    id_bufalo: string;
    onAddSave: (data: ZootecnicoPayload) => void;
    onClose: () => void;
}

const initialFormData: ZootecnicoPayload = {
    peso: undefined,
    condicao_corporal: undefined,
    cor_pelagem: '',
    formato_chifre: '',
    porte_corporal: '',
    dt_registro: dayjs().format("YYYY-MM-DD"),
    tipo_pesagem: '',
};

// ==========================================================
// --- Componente de Input com Floating Label (UNIFICADO) ---
// ==========================================================
interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    multiline?: boolean;
    style?: any;
    editable?: boolean;
}

// Estilos de suporte para o Floating Label (Definidos no final, mas replicados aqui para o componente funcionar)
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
    // Estilo não usado diretamente aqui, mas parte do padrão
    inputContainerMultiline: {
        height: 120,
    },
});

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label,
    value,
    onChangeText,
    keyboardType = "default",
    multiline = false,
    style,
    editable = true,
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
        top: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [18, -12] }),
        fontSize: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
        color: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [mergedColors.gray.base, isFocused ? mergedColors.primary.base : mergedColors.gray.base], 
        }),
    };

    const borderColor = isFocused ? mergedColors.primary.base : mergedColors.border;
    const backgroundColor = editable ? mergedColors.white.base : mergedColors.gray.claro;
    
    return (
        <View style={[
            floatingStyles.inputContainer, 
            multiline && { height: 120 }, // Ajuste de altura para multiline
            style
        ]}>
            <Animated.Text style={[floatingStyles.label, labelStyle]}>
                {label}
            </Animated.Text>
            <TextInput
                style={[
                    styles.inputBase, 
                    { 
                        borderColor: borderColor, 
                        backgroundColor: backgroundColor,
                        color: editable ? mergedColors.text.primary : mergedColors.gray.base,
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
                editable={editable}
                placeholderTextColor="transparent"
            />
        </View>
    );
};
// ==========================================================

export const ZootecnicoAddBottomSheet: React.FC<ZootecnicoAddBottomSheetProps> = ({ id_bufalo, onClose, onAddSave}) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["80%", "90%"], []);
    
    const [formData, setFormData] = useState<ZootecnicoPayload>({ ...initialFormData });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleChange = (key: keyof ZootecnicoPayload, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const showToast = (message: string, isError: boolean = false) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            Alert.alert(isError ? "Erro" : "Sucesso", message);
        }
    };


    const handleSave = () => {
        // Validação básica para evitar save vazio
        if (!formData.peso && !formData.condicao_corporal && !formData.cor_pelagem && !formData.formato_chifre && !formData.porte_corporal) {
             showToast("Preencha ao menos um campo de métrica/característica.", true);
             return;
        }

        setIsSaving(true); 
        
        const payloadApi: ZootecnicoPayload = {
            ...formData,
            peso: formData.peso ? Number(formData.peso) : undefined,
            condicao_corporal: formData.condicao_corporal ? Number(formData.condicao_corporal) : undefined,
        };
        
        // Remove campos vazios, nulos ou indefinidos do payload
        const cleanedPayload = Object.fromEntries(
            Object.entries(payloadApi).filter(([_, value]) => value !== null && value !== undefined && value !== '')
        ) as ZootecnicoPayload;
        
        // Simulação de delay para o botão de salvar
        setTimeout(() => {
            onAddSave(cleanedPayload); 
            setIsSaving(false);
            showToast("Registro zootécnico adicionado com sucesso!");
            onClose();
        }, 800);
    };
    
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "Nda";
        return dayjs(dateString).format("DD/MM/YYYY");
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
        nestedScrollEnabled={true} // RESOLVE O PROBLEMA DE SCROLL EM ANDROID
    >

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Novo Registro Zootécnico</Text>
                </View>


                {/* Lista */}
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Métricas Corporais</Text>
                    
                        {/* INPUT: Peso (com Floating Label) */}
                        <InputWithFloatingLabel
                            label="Peso (kg)"
                            value={String(formData.peso ?? "")}
                            onChangeText={(t) => handleChange("peso", t)}
                            keyboardType="numeric"
                        />
                    
                    {/* Condição Corporal */}
                        <Text style={styles.listLabel}>Cond. Corporal:</Text>
                        <View style={styles.radioGroupRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <TouchableOpacity
                            key={n}
                            onPress={() => handleChange("condicao_corporal", String(n))}
                            style={styles.radioItem}
                            >
                            <View style={styles.radioCircle}>
                                {String(formData.condicao_corporal) === String(n) && (
                                <View style={styles.radioSelected} />
                                )}
                            </View>
                            <Text style={styles.radioLabel}>{n}</Text>
                            </TouchableOpacity>
                        ))}
                        </View>
                    
                    <Text style={styles.sectionTitle}>Características Corporais</Text>
                    {/* INPUT: Cor Pelagem (com Floating Label) */}
                        <InputWithFloatingLabel
                            label="Cor Pelagem"
                            value={formData.cor_pelagem ?? ""}
                            onChangeText={(t) => handleChange("cor_pelagem", t)}
                        />

                    {/* INPUT: Formato Chifre (com Floating Label) */}
                        <InputWithFloatingLabel
                            label="Formato Chifre"
                            value={formData.formato_chifre ?? ""}
                            onChangeText={(t) => handleChange("formato_chifre", t)}
                        />

                    {/* INPUT: Porte Corporal (com Floating Label) */}
                        <InputWithFloatingLabel
                            label="Porte Corporal"
                            value={formData.porte_corporal ?? ""}
                            onChangeText={(t) => handleChange("porte_corporal", t)}
                        />
                    
                    <Text style={styles.sectionTitle}>Adicional</Text>
                    {/* INPUT: Tipo Pesagem (com Floating Label) */}
                        <InputWithFloatingLabel
                            label="Tipo Pesagem"
                            value={formData.tipo_pesagem ?? ""}
                            onChangeText={(t) => handleChange("tipo_pesagem", t)}
                        />
                        
                        {/* Data de Registro (Ajustado ao padrão dateFieldContainer) */}
                        <View style={styles.dateFieldContainer}>
                            <Text style={styles.listLabel}>Data Registro:</Text>
                            <TouchableOpacity style={styles.dateDisplayButton} onPress={() => setShowDatePicker(true)}>
                                <Text style={styles.dateDisplayValue}>
                                    {formatDate(formData.dt_registro)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <YellowButton
                        title={isSaving ? "Salvando..." : "Adicionar Registro"}
                        onPress={handleSave}
                        disabled={isSaving}
                    />
                </View>

                <DatePickerModal
                  visible={showDatePicker}
                  date={formData.dt_registro}
                  onClose={() => setShowDatePicker(false)}
                  onSelectDate={(selected) => {
                    handleChange("dt_registro", dayjs(selected).format("YYYY-MM-DD"));
                  }}
                />
    </BottomSheetScrollView>
  </BottomSheet>
)};

// ==========================================================
// --- ESTILOS UNIFICADOS ---
// ==========================================================
// Estilos de suporte para o Floating Label
const floatingStylesFinal = StyleSheet.create({
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
        minHeight: 50, // Adicionado para garantir altura mínima
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible",
        zIndex: 100, // ZIndex para garantir que o floating label apareça
    },
    listLabel: {
        fontSize: 14, // Padrão 14 para labels
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginBottom: 4,
        flex: 1, // Permite que a data fique ao lado
    },
    dateFieldContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        marginBottom: 8,
        borderTopWidth: 1,
        borderTopColor: mergedColors.border,
        marginTop: 8, // Espaço antes do primeiro elemento
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
        // Removido marginRight 8, se for para não ter ícone
    },
    
    // --- Radio Button (Condição Corporal) ---
    radioGroupRow: {
        flexDirection: "row", 
        marginBottom: 12,
        marginTop: 8,
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: mergedColors.border,
        borderRadius: 8,
    },
    radioItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        flex: 1,
        justifyContent: "center",
        gap: 4,
        // Adiciona divisória
        borderRightWidth: 1,
        borderRightColor: mergedColors.border,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: mergedColors.gray.base,
        alignItems: "center",
        justifyContent: "center",
    },
    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: mergedColors.primary.base,
    },
    radioLabel: {
        fontSize: 14,
        color: mergedColors.text.primary,
        fontWeight: "600",
    },

    // Remove a borda do último item da lista de rádio
    lastRadioItem: {
        borderRightWidth: 0,
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
});