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
} from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal";
import dayjs from "dayjs";
import YellowButton from "../Button"; // Assumindo que o YellowButton é o componente de botão padrão
import { formatarDataBR } from "../../utils/date";
import SelectBottomSheet from "../SelectBottomSheet";

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
    condicaoCorporal?: number;
    corPelagem?: string;
    formatoChifre?: string;
    porteCorporal?: string;
    dtRegistro: string;
    tipoPesagem?: string;
}

interface ZootecnicoAddBottomSheetProps {
    id_bufalo: string;
    onAddSave: (data: ZootecnicoPayload) => void;
    onClose: () => void;
}

const initialFormData: ZootecnicoPayload = {
    peso: undefined,
    condicaoCorporal: undefined,
    corPelagem: '',
    formatoChifre: '',
    porteCorporal: '',
    dtRegistro: dayjs().format("YYYY-MM-DD"),
    tipoPesagem: '',
};


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
        if (!formData.peso && !formData.condicaoCorporal && !formData.corPelagem && !formData.formatoChifre && !formData.porteCorporal) {
             showToast("Preencha ao menos um campo de métrica/característica.", true);
             return;
        }

        setIsSaving(true); 
        
        const payloadApi: ZootecnicoPayload = {
            ...formData,
            peso: formData.peso ? Number(formData.peso) : undefined,
            condicaoCorporal: formData.condicaoCorporal ? Number(formData.condicaoCorporal) : undefined,
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
                    <Text style={styles.sectionTitle}>Coleta de dados</Text>
                    <View style={styles.listContainer}>
                        {/* Data de Registro (Ajustado ao padrão dateFieldContainer) */}
                        <View style={styles.dateFieldContainer}>
                            <Text style={styles.listLabel}>Data Registro:</Text>
                            <TouchableOpacity style={styles.dateDisplayButton} onPress={() => setShowDatePicker(true)}>
                                <Text style={styles.dateDisplayValue}>
                                    {formatarDataBR(formData.dtRegistro)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    {/* INPUT: Tipo Pesagem */}
                     <Text style={styles.label}>Tipo Pesagem</Text>
                        <SelectBottomSheet
                            items={[
                                { label: "Semanal", value: "Semanal" },
                                { label: "Quinzenal", value: "Quinzenal" },
                                { label: "Mensal", value: "Mensal" },
                                { label: "Semestral", value: "Semestral" },
                            ]}
                            value={formData.tipoPesagem ?? ""}
                            onChange={(t) => handleChange("tipoPesagem", t)}
                            title="Selecionar o tipo de pesagem"
                            placeholder="Digite o tipo de pesagem"/>
                    </View>                


                {/* Lista */}
                <Text style={styles.sectionTitle}>Métricas Corporais</Text>
                <View style={styles.listContainer}>
                     {/* INPUT: Peso (com Floating Label) */}
                     <Text style={styles.label}>Peso (kg)</Text>
                     <TextInput
                         style={styles.inputBase}
                         value={String(formData.peso ?? "")}
                         onChangeText={(t) => handleChange("peso", t)}
                         keyboardType="numeric"
                         placeholder="Digite o peso do animal"/>                   
                         
                    {/* Condição Corporal */}
                        <Text style={styles.listLabel}>Cond. Corporal:</Text>
                        <View style={styles.radioGroupRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <TouchableOpacity
                            key={n}
                            onPress={() => handleChange("condicaoCorporal", String(n))}
                            style={styles.radioItem}
                            >
                            <View style={styles.radioCircle}>
                                {String(formData.condicaoCorporal) === String(n) && (
                                <View style={styles.radioSelected} />
                                )}
                            </View>
                            <Text style={styles.radioLabel}>{n}</Text>
                            </TouchableOpacity>
                        ))}
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Características Corporais</Text>
                    <View style={styles.listContainer}>
                    {/* INPUT: Cor Pelagem (com Floating Label) */}
                     <Text style={styles.label}>Cor Pelagem</Text>
                     <TextInput
                         style={styles.inputBase}
                         value={formData.corPelagem ?? ""}
                         onChangeText={(t) => handleChange("corPelagem", t)}
                         placeholder="Digite a cor da pelagem"/>    

                    {/* INPUT: Formato Chifre (com Floating Label) */}
                     <Text style={styles.label}>Formato Chifre</Text>
                     <TextInput
                         style={styles.inputBase}
                         value={formData.formatoChifre ?? ""}
                         onChangeText={(t) => handleChange("formatoChifre", t)}
                         placeholder="Digite o formato do chifre"/>  

                    {/* INPUT: Porte Corporal (com Floating Label) */}
                     <Text style={styles.label}>Porte Corporal</Text>
                     <TextInput
                         style={styles.inputBase}
                         value={formData.porteCorporal ?? ""}
                         onChangeText={(t) => handleChange("porteCorporal", t)}
                         placeholder="Digite o porte corporal"/> 
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
                  date={formData.dtRegistro}
                  onClose={() => setShowDatePicker(false)}
                  onSelectDate={(selected) => {
                    handleChange("dtRegistro", dayjs(selected).format("YYYY-MM-DD"));
                  }}
                />
    </BottomSheetScrollView>
  </BottomSheet>
)};

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
        marginTop: 5,
        marginBottom: 12,
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
        marginBottom: 12,
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
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
});