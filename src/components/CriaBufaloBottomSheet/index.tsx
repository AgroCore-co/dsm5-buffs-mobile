import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Platform as RNPlatform, 
    ToastAndroid, 
    Alert,
    Animated,
    Easing 
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import bufaloService from "../../services/bufaloService";
import { usePropriedade } from "../../context/PropriedadeContext";
import YellowButton from "../Button"; 
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal"; 
import dayjs from "dayjs";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";

// ==========================================================
// --- CONFIGURAÇÃO DE CORES (Padrão Unificado) ---
// ==========================================================
const defaultColors = {
    primary: { base: "#FAC638" },
    gray: { base: "#6B7280", claro: "#F8F7F5" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};
const mergedColors = { ...defaultColors, ...colors };

// ==========================================================
// --- Componente de Input com Floating Label (REPLICADO) ---
// ==========================================================
interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
    multiline?: boolean;
    style?: any; 
}

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label, value, onChangeText, keyboardType = "default", multiline = false, style,
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
    
    return (
        <View style={[floatingStylesLocal.inputContainer, multiline && floatingStylesLocal.inputContainerMultiline, style]}>
            <Animated.Text style={[floatingStylesLocal.label, labelStyle]}>
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
// --- Fim Componente de Input com Floating Label ---

// ==========================================================
// --- COMPONENTE PRINCIPAL ---
// ==========================================================
interface CadastrarBufaloFormProps {
    onClose: () => void;
}

export const CadastrarBufaloForm: React.FC<CadastrarBufaloFormProps> = ({ onClose }) => {
    const sheetRef = useRef<BottomSheet>(null);
    // Aumentado o snapPoints para acomodar mais campos
    const snapPoints = useMemo(() => ["80%", "95%"], []); 
    const { propriedadeSelecionada } = usePropriedade();

    const [nome, setNome] = useState("");
    const [brinco, setBrinco] = useState("");
    const [microchip, setMicrochip] = useState("");
    const [dtNascimento, setDtNascimento] = useState<string | undefined>(undefined);
    const [sexo, setSexo] = useState<string | null>(null); // Alterado para null para Dropdown
    const [nivelMaturidade, setNivelMaturidade] = useState<string | null>(null); // Alterado para null
    const [idRaca, setIdRaca] = useState<number | null>(null);
    const [brincoPai, setBrincoPai] = useState("");
    const [brincoMae, setBrincoMae] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [racas, setRacas] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [openSexo, setOpenSexo] = useState(false);
    const [openMaturidade, setOpenMaturidade] = useState(false);
    const [openRaca, setOpenRaca] = useState(false);
    
    // Função para gerenciar o zIndex dos Dropdowns. O último aberto deve ter o maior zIndex.
    const getDropdownZIndex = useCallback((name: 'sexo' | 'maturidade' | 'raca') => {
        if (openRaca) return name === 'raca' ? 5001 : 1;
        if (openSexo) return name === 'sexo' ? 5001 : 1;
        if (openMaturidade) return name === 'maturidade' ? 5001 : 1;
        return 1;
    }, [openRaca, openSexo, openMaturidade]);


    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        const fetchRacas = async () => {
        try {
            // Verifica se a estrutura de raças retornada é compatível
            const racasApi = await bufaloService.getRacas();
            const mappedRacas = racasApi.map((r: { nome: any; id_raca: any; }) => ({ 
                label: r.nome, 
                value: r.id_raca 
            }));
            setRacas(mappedRacas);
        } catch (err) {
            console.error("Erro ao buscar raças:", err);
        }
        };
        fetchRacas();
    }, []);

    const showToast = (message: string, isError: boolean = false) => {
        if (RNPlatform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
        Alert.alert(isError ? "Erro" : "Sucesso", message);
        }
    };

    const handleSave = async () => {
        if (isSaving) return;

        if (!propriedadeSelecionada) {
            showToast("Selecione uma propriedade antes de cadastrar.", true);
            return;
        }

        if (!brinco) {
             showToast("O campo Brinco é obrigatório.", true);
             return;
        }
        if (!sexo) {
             showToast("O campo Sexo é obrigatório.", true);
             return;
        }

        setIsSaving(true);

        try {
            let idPai: number | null = null;
            if (brincoPai) {
                const paiEncontrado = await bufaloService.getBufaloByBrincoAndSexo(
                propriedadeSelecionada, brincoPai, "M"
                );
                if (!paiEncontrado) {
                    showToast("Nenhum pai encontrado com esse brinco (Macho) na propriedade.", true);
                    setIsSaving(false);
                    return;
                }
                idPai = paiEncontrado.id || paiEncontrado.id_bufalo;
            }

            let idMae: number | null = null;
            if (brincoMae) {
                const maeEncontrada = await bufaloService.getBufaloByBrincoAndSexo(
                propriedadeSelecionada, brincoMae, "F"
                );
                if (!maeEncontrada) {
                    showToast("Nenhuma mãe encontrada com esse brinco (Fêmea) na propriedade.", true);
                    setIsSaving(false);
                    return;
                }
                idMae = maeEncontrada.id || maeEncontrada.id_bufalo;
            }

            const payload = {
                nome: nome || undefined,
                brinco,
                microchip: microchip || undefined,
                dt_nascimento: dtNascimento || undefined,
                sexo,
                nivel_maturidade: nivelMaturidade || "PA", // Assumindo "PA" (Padrão) se nulo
                id_raca: idRaca || undefined,
                id_pai: idPai,
                id_mae: idMae,
                status: true,
                categoria: "PA", // Categoria fixa (Padrão)
                id_propriedade: propriedadeSelecionada,
            };
            
            // Remove campos nulos/vazios do payload, exceto o brinco que é obrigatório e já foi validado.
            const cleanedPayload = Object.fromEntries(
                Object.entries(payload).filter(([_, value]) => value !== null && value !== undefined && value !== '')
            );

            await bufaloService.createBufalo(cleanedPayload);
            showToast("Búfalo cadastrado com sucesso!");
            onClose();
        } catch (err) { 
            console.error("Erro ao salvar búfalo:", err);
            showToast("Não foi possível salvar o búfalo.", true);
        } finally {
            setIsSaving(false);
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
            <BottomSheetScrollView contentContainerStyle={styles.container}
            // Adiciona nestedScrollEnabled para melhor comportamento com Dropdowns
            nestedScrollEnabled={true}>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Novo Cadastro de Búfalo</Text>
                </View>

                {/* Dados Básicos */}
                <Text style={styles.sectionTitle}>Dados de Identificação</Text>
                <View style={styles.listContainer}>
                    <InputWithFloatingLabel
                        label="Nome (Opcional)"
                        value={nome}
                        onChangeText={setNome}
                        style={styles.inputSpacing}
                    />
                    <InputWithFloatingLabel
                        label="Brinco (Obrigatório)"
                        value={brinco}
                        onChangeText={setBrinco}
                        style={styles.inputSpacing}
                    />
                    <InputWithFloatingLabel
                        label="Microchip (Opcional)"
                        value={microchip}
                        onChangeText={setMicrochip}
                    />
                </View>

                {/* Características */}
                <Text style={styles.sectionTitle}>Características e Origem</Text>
                <View style={styles.listContainer}>
                    
                    {/* Sexo e Maturidade (Dropdowns lado a lado) */}
                    <View style={styles.row}>
                        
                        {/* Sexo */}
                        <View style={[styles.halfInput, { zIndex: getDropdownZIndex('sexo') }]}>
                            <Text style={styles.dropdownLabel}>Sexo:</Text>
                            <DropDownPicker
                                open={openSexo}
                                setOpen={setOpenSexo}
                                value={sexo}
                                setValue={setSexo}
                                items={[
                                    { label: "Macho", value: "M" },
                                    { label: "Fêmea", value: "F" },
                                ]}
                                placeholder="Selecione"
                                style={styles.dropdownStyle}
                                dropDownContainerStyle={styles.dropdownContainerStyle}
                                listMode="SCROLLVIEW"
                            />
                        </View>
                        
                        {/* Maturidade */}
                        <View style={[styles.halfInput, { zIndex: getDropdownZIndex('maturidade') }]}>
                            <Text style={styles.dropdownLabel}>Maturidade:</Text>
                            <DropDownPicker
                                open={openMaturidade}
                                setOpen={setOpenMaturidade}
                                value={nivelMaturidade}
                                setValue={setNivelMaturidade}
                                items={[
                                    { label: "Bezerro", value: "B" },
                                    { label: "Novilha", value: "N" },
                                    { label: "Vaca", value: "V" },
                                    { label: "Touro", value: "T" },
                                ]}
                                placeholder="Selecione"
                                style={styles.dropdownStyle}
                                dropDownContainerStyle={styles.dropdownContainerStyle}
                                listMode="SCROLLVIEW"
                            />
                        </View>
                    </View>

                    {/* Data de Nascimento (NOVO DESIGN DE DATA) */}
                    <View style={styles.dateFieldContainer}>
                        <Text style={styles.listLabel}>Data de Nascimento:</Text>
                        <TouchableOpacity 
                            onPress={() => setShowDatePicker(true)}
                            style={styles.dateDisplayButton}
                        >
                            <Text style={styles.dateDisplayValue}>
                                {dtNascimento ? dayjs(dtNascimento).format("DD/MM/YYYY") : "Selecionar"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Raça (Dropdown Full Width) */}
                    <View style={[{ zIndex: getDropdownZIndex('raca'), marginBottom: 12 }]}>
                        <Text style={styles.dropdownLabel}>Raça:</Text>
                        <DropDownPicker
                            open={openRaca}
                            setOpen={setOpenRaca}
                            value={idRaca}
                            setValue={setIdRaca}
                            items={racas} // Já mapeadas no useEffect
                            placeholder="Selecione Raça"
                            style={styles.dropdownStyle}
                            dropDownContainerStyle={styles.dropdownContainerStyle}
                            listMode="SCROLLVIEW"
                        />
                    </View>
                    
                    {/* Parentesco (Floating Labels lado a lado) */}
                    <Text style={[styles.parentescoTitle]}>Parentesco (Brincos Opcionais):</Text>
                    <View style={styles.row}>
                        <InputWithFloatingLabel 
                            label="Brinco do Pai (Macho)" 
                            value={brincoPai} 
                            onChangeText={setBrincoPai} 
                            style={styles.halfInput}
                        />
                        <InputWithFloatingLabel 
                            label="Brinco da Mãe (Fêmea)" 
                            value={brincoMae} 
                            onChangeText={setBrincoMae} 
                            style={styles.halfInput}
                        />
                    </View>

                </View>

                {/* Footer (Botão de ação) */}
                <View style={styles.footer}>
                    <YellowButton 
                        title={isSaving ? "Salvando..." : "Salvar Cadastro"} 
                        onPress={handleSave} 
                        disabled={isSaving}
                    />
                </View>

                {/* Modal de Data */}
                <DatePickerModal
                    visible={showDatePicker}
                    date={dtNascimento}
                    onClose={() => setShowDatePicker(false)}
                    onSelectDate={(selected) => setDtNascimento(dayjs(selected).format("YYYY-MM-DD"))}
                />
            </BottomSheetScrollView>
        </BottomSheet>
    );
};

// ==========================================================
// --- ESTILOS UNIFICADOS ---
// ==========================================================
const floatingStylesLocal = StyleSheet.create({
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
        minHeight: 50,
    },

    // --- Estilos de Layout ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", 
    },
    inputSpacing: {
        marginBottom: 12,
    },
    row: { 
        flexDirection: "row", 
        justifyContent: "space-between", 
        marginBottom: 0, // O espaçamento está dentro dos Floating Labels (inputContainer)
        gap: 16,
    },
    halfInput: {
        flex: 1,
    },
    
    // --- Dropdown ---
    dropdownLabel: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
    dropdownStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
        minHeight: 50,
        marginBottom: 12,
    },
    dropdownContainerStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
    },

    // --- Campo de Data Intuitivo ---
    dateFieldContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 0,
        marginBottom: 16,
        marginTop: 8,
        borderBottomWidth: 1, // Adiciona uma linha sutil para separar
        borderBottomColor: mergedColors.border,
    },
    listLabel: {
        fontSize: 16,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        flex: 1,
    },
    dateDisplayButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
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
    parentescoTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: mergedColors.text.secondary,
        marginBottom: 4,
        marginTop: 4,
    },

    // --- Footer ---
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        padding: 16,
        borderTopWidth: 1,
        borderColor: mergedColors.border,
        marginTop: 16,
        backgroundColor: mergedColors.white.base,
    },
});