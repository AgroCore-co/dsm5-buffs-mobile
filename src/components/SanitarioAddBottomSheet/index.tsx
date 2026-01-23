import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    Switch, 
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
import DropDownPicker from "react-native-dropdown-picker"; 
import sanitarioService from "../../services/sanitarioService"; 
import YellowButton from "../Button"; // Assumindo o componente de botão padrão

// ==========================================================
// --- CONFIGURAÇÃO DE CORES (Padrão Unificado) ---
// ==========================================================
const defaultColors = {
    primary: { base: "#FAC638" },
    gray: { base: "#6B7280", claro: "#F8F7F5", disabled: "#E5E7EB" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};
const mergedColors = { ...defaultColors, ...colors };

// ==========================================================
// --- INTERFACES E DADOS ---
// ==========================================================
interface SanitarioPayload {
    id_bufalo: string;
    id_medicao?: string;
    dt_aplicacao: string;
    dosagem?: number;
    unidade_medida?: string;
    doenca?: string;
    necessita_retorno?: boolean;
    dt_retorno?: string;
    observacao?: string;
}

interface SanitarioAddBottomSheetProps {
    id_bufalo: string;
    onAddSave: (data: SanitarioPayload) => void;
    onClose: () => void;
    propriedadeId: number;
}

const initialFormData: Omit<SanitarioPayload, 'id_bufalo'> = {
    dt_aplicacao: dayjs().format("YYYY-MM-DD"), 
    dosagem: undefined,
    unidade_medida: '',
    doenca: '',
    necessita_retorno: false,
    dt_retorno: undefined,
    observacao: '',
    id_medicao: undefined,
};

// ==========================================================
// --- Componente de Input com Floating Label (UNIFICADO) ---
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
    // Usa 'floatingStylesLocal' e 'styles.inputBase' definidos no final
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


export const SanitarioAddBottomSheet: React.FC<SanitarioAddBottomSheetProps> = ({ id_bufalo, onAddSave, onClose, propriedadeId}) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["70%", "90%"], []);
    
    const [formData, setFormData] = useState<Omit<SanitarioPayload, 'id_bufalo'>>({ ...initialFormData });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [medicacoes, setMedicacoes] = useState<{label:string,value:string}[]>([]);
    const [openMedicacao, setOpenMedicacao] = useState(false);
    const [medicacaoSelecionada, setMedicacaoSelecionada] = useState<string | null>(null);
    const [loadingMedicacoes, setLoadingMedicacoes] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Para desabilitar o botão
    
    // Sincroniza o id_medicao
    useEffect(() => {
        setFormData(prev => ({ ...prev, id_medicao: medicacaoSelecionada || undefined }));
    }, [medicacaoSelecionada]);

    // Lógica de carregamento de medicações
    useEffect(() => {
        const fetchMedicacoes = async () => {
          if (!propriedadeId){
            setLoadingMedicacoes(false);
            return;
          }
          setLoadingMedicacoes(true);
          try {
            // Assumindo que `sanitarioService.getMedicamentosByPropriedade` existe e funciona
            const data = await sanitarioService.getMedicamentosByPropriedade(propriedadeId);
            
            const mappedData = data.map(g => ({ 
                label: g.medicacao, 
                value: String(g.id_medicacao) 
            }));
            
            setMedicacoes(mappedData);
          } catch (error) {
              console.error("Erro ao carregar medicações:", error);
          } finally {
              setLoadingMedicacoes(false); 
          }
        };
        fetchMedicacoes();
    }, [propriedadeId]);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleChange = (key: keyof typeof initialFormData, value: any) => {
        // Se o retorno for desativado, limpa a data de retorno
        if (key === 'necessita_retorno' && value === false) {
             setFormData((prev) => ({ ...prev, [key]: value, dt_retorno: undefined }));
        } else {
             setFormData((prev) => ({ ...prev, [key]: value }));
        }
    };

    const showToast = (message: string, isError: boolean = false) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            Alert.alert(isError ? "Erro" : "Sucesso", message);
        }
    };


    const handleSave = () => {
        if (isSaving) return;
        
        if (!formData.doenca && !formData.id_medicao) {
            return showToast("Preencha o nome da Doença ou selecione uma Medicação.", true);
        }

        setIsSaving(true); 
        
        const payloadApi: SanitarioPayload = {
            id_bufalo: id_bufalo,
            id_medicao: formData.id_medicao,
            dt_aplicacao: formData.dt_aplicacao,
            dosagem: formData.dosagem ? Number(formData.dosagem) : undefined,
            unidade_medida: formData.unidade_medida,
            doenca: formData.doenca,
            necessita_retorno: formData.necessita_retorno,
            // Inclui dt_retorno apenas se necessário e preenchido
            dt_retorno: (formData.necessita_retorno && formData.dt_retorno) ? formData.dt_retorno : undefined, 
            observacao: formData.observacao,
        };
        
        // Remove campos vazios, nulos ou indefinidos do payload
        const cleanedPayload = Object.fromEntries(
            Object.entries(payloadApi).filter(([_, value]) => value !== null && value !== undefined && value !== '')
        ) as SanitarioPayload;
        
        // Simulação de delay para o botão de salvar
        setTimeout(() => {
            onAddSave(cleanedPayload); 
            setIsSaving(false);
            showToast("Registro sanitário adicionado com sucesso!");
            onClose();
        }, 800);
    };
    
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "Selecionar";
        return dayjs(dateString).format("DD/MM/YYYY"); 
    };

    // Determina qual data o Modal deve abrir
    const dateToOpen = useMemo(() => {
        if (showDatePicker) {
            // Se o retorno é necessário mas ainda não tem data, abre para o retorno
            if (formData.necessita_retorno && !formData.dt_retorno) {
                return dayjs().format("YYYY-MM-DD"); // Sugere hoje ou uma data padrão
            }
            // Se clicou na data de aplicação, usa a data de aplicação
            return formData.dt_retorno || formData.dt_aplicacao || dayjs().format("YYYY-MM-DD");
        }
        return dayjs().format("YYYY-MM-DD");
    }, [showDatePicker, formData.dt_aplicacao, formData.dt_retorno, formData.necessita_retorno]);


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
        nestedScrollEnabled={true}
        // Desativa o scroll do ScrollView quando o Dropdown está aberto
        scrollEnabled={!openMedicacao} 
    >

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Novo Registro Sanitário</Text>
                </View>

                {/* Data de Aplicação (NOVO DESIGN DE DATA - Fora do Container Principal) */}
                <View style={styles.listContainerHeader}>
                    <Text style={styles.listLabel}>Data Aplicação:</Text>
                    <TouchableOpacity 
                        onPress={() => setShowDatePicker(true)}
                        style={styles.dateDisplayButton}
                    >
                        <Text style={styles.dateDisplayValue}>
                            {formatDate(formData.dt_aplicacao)}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.sectionTitle}>Detalhes do Tratamento</Text>

                {/* Lista */}
                <View style={styles.listContainer}>

                    {/* Doença (FLOATING LABEL) */}
                    <InputWithFloatingLabel
                        label="Doença (Opcional)"
                        value={formData.doenca ?? ""}
                        onChangeText={(t) => handleChange("doenca", t)}
                    />
                    
                    {/* Medicação (Dropdown) */}
                    <View style={styles.dropdownItem}>
                        <Text style={styles.listLabelDropdown}>Medicação:</Text>
                        <View style={{ flex: 1, zIndex: openMedicacao ? 4000 : 1 }}>
                            {loadingMedicacoes ? (
                                <Text style={styles.listValue}>Carregando medicações...</Text>
                            ) : (
                                <DropDownPicker
                                    open={openMedicacao}
                                    setOpen={setOpenMedicacao}
                                    value={medicacaoSelecionada}
                                    setValue={setMedicacaoSelecionada}
                                    items={medicacoes}
                                    placeholder="Selecione a Medicação"
                                    style={styles.dropdownStyle}
                                    dropDownContainerStyle={styles.dropdownContainerStyle}
                                    listMode="SCROLLVIEW"
                                    // ZIndex para garantir que ele esteja acima do conteúdo
                                    zIndex={openMedicacao ? 4000 : 1}
                                    zIndexInverse={openMedicacao ? 1 : 4000}
                                />
                            )}
                        </View>
                    </View>

                    {/* Dosagem (Campos lado a lado com FLOATING LABEL) */}
                    <View style={styles.dosagemGroup}>
                        {/* Dosagem (Input 1) */}
                        <InputWithFloatingLabel
                            label="Dosagem"
                            value={String(formData.dosagem ?? "")}
                            onChangeText={(t) => handleChange("dosagem", t)}
                            keyboardType="numeric"
                            style={styles.dosagemInput}
                        />
                        {/* Unidade de Medida (Input 2) */}
                        <InputWithFloatingLabel
                            label="Unidade Md."
                            value={formData.unidade_medida ?? ""}
                            onChangeText={(t) => handleChange("unidade_medida", t)}
                            style={styles.unidadeInput}
                        />
                    </View>

                    {/* Necessita retorno (SWITCH ESTILIZADO) */}
                    <View style={styles.switchItem}>
                        <Text style={styles.listLabel}>Necessita retorno:</Text>
                        <Switch
                            value={Boolean(formData.necessita_retorno)}
                            onValueChange={(v) => handleChange("necessita_retorno", v)}
                            thumbColor={mergedColors.white.base}
                            trackColor={{ false: mergedColors.border, true: mergedColors.primary.base }}
                        />
                    </View>

                    {/* Data Retorno (NOVO DESIGN DE DATA - Condicional) */}
                    {formData.necessita_retorno && (
                      <View style={styles.dateFieldContainer}>
                        <Text style={styles.listLabel}>Data Retorno:</Text>
                        <TouchableOpacity 
                            // Abre o DatePicker focado na data de retorno
                            onPress={() => setShowDatePicker(true)}
                            style={styles.dateDisplayButton}
                        >
                            <Text style={styles.dateDisplayValue}>
                                {formatDate(formData.dt_retorno)}
                            </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Observação (FLOATING LABEL e multiline) */}
                    <InputWithFloatingLabel
                        label="Observação (Opcional)"
                        value={formData.observacao ?? ""}
                        onChangeText={(t) => handleChange("observacao", t)}
                        multiline={true}
                        style={styles.observacaoInput}
                    />
                </View>

                {/* Footer (Botão de ação) */}
                <View style={styles.footer}>
                    <YellowButton
                        title={isSaving ? "Salvando..." : "Adicionar Registro"}
                        onPress={handleSave}
                        disabled={isSaving}
                    />
                </View>

                {/* Modal de Data */}
                <DatePickerModal
                  visible={showDatePicker}
                  date={dateToOpen} // Usa a data calculada
                  onClose={() => setShowDatePicker(false)}
                  onSelectDate={(selected) => {
                    const selectedDate = dayjs(selected).format("YYYY-MM-DD");
                    // Se o retorno é necessário E o dt_retorno está vazio (indicando que foi o botão de retorno que abriu) OU a data atual é a data de retorno (ajuste complexo para evitar bugs)
                    // Simplificando: se a data de retorno está sendo exibida, atualiza ela. Senão, atualiza a data de aplicação.
                    if (formData.necessita_retorno && (dateToOpen === formData.dt_retorno || !formData.dt_retorno)) {
                        handleChange("dt_retorno", selectedDate);
                    } else {
                        handleChange("dt_aplicacao", selectedDate);
                    }
                  }}
                />
    </BottomSheetScrollView>
  </BottomSheet>
)};

// ==========================================================
// --- ESTILOS UNIFICADOS (Baseados no seu padrão) ---
// ==========================================================
// Estilos de suporte para o Floating Label
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

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible",
    },
    listContainerHeader: { // Para o item de data fora do listContainer principal (Data Aplicação)
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
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
    listValue: { // Usado para "Carregando"
        fontSize: 14,
        color: mergedColors.text.secondary,
        textAlign: "right",
        minWidth: 60,
    },

    // --- Campo de Data Intuitivo (Data Retorno) ---
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

    // --- Dosagem Group (Campos Lado a Lado) ---
    dosagemGroup: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 12,
    },
    dosagemInput: {
        flex: 2, 
    },
    unidadeInput: {
        flex: 1, 
    },
    
    // --- Switch/Toggle ---
    switchItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        // Mantido o marginBottom para seguir o padrão de espaçamento
        marginBottom: 12, 
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
        minHeight: 50,
    },
    dropdownContainerStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
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
        backgroundColor: mergedColors.white.base,
    },
    footerBtn: {
        // Estilos do botão replicados para quando o YellowButton não é usado diretamente
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
});