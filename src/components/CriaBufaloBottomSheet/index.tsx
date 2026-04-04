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
import bufaloService from "../../services/bufaloService";
import { usePropriedade } from "../../context/PropriedadeContext";
import YellowButton from "../Button"; 
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal"; 
import dayjs from "dayjs";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import SelectBottomSheet from "../SelectBottomSheet";

const defaultColors = {
    primary: { base: "#FAC638" },
    gray: { base: "#6B7280", claro: "#F8F7F5" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" }
};
const mergedColors = { ...defaultColors, ...colors };

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
    const [idRaca, setIdRaca] = useState<string | null>(null);
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
            const mappedRacas = racasApi.map((r: { nome: any; idRaca: any; }) => ({ 
                label: r.nome, 
                value: r.idRaca 
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
            let idPai: string | null = null;
            if (brincoPai) {
                const paiEncontrado = await bufaloService.getBufaloByBrincoAndSexo(
                propriedadeSelecionada, brincoPai, "M"
                );
                if (!paiEncontrado) {
                    showToast("Nenhum pai encontrado com esse brinco (Macho) na propriedade.", true);
                    setIsSaving(false);
                    return;
                }
                idPai = paiEncontrado.idBufalo;
            }

            let idMae: string | null = null;
            if (brincoMae) {
                const maeEncontrada = await bufaloService.getBufaloByBrincoAndSexo(
                propriedadeSelecionada, brincoMae, "F"
                );
                if (!maeEncontrada) {
                    showToast("Nenhuma mãe encontrada com esse brinco (Fêmea) na propriedade.", true);
                    setIsSaving(false);
                    return;
                }
                idMae = maeEncontrada.idBufalo;
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
            
            console.log("Payload para criação do búfalo:", payload);

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
                    <View style={styles.inputSpacing}>
                        <Text style={styles.label}>Nome (Opcional)</Text>
                        <TextInput
                            style={styles.inputBase}
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Digite o nome do animal"/>
                    </View>
                    <View style={styles.inputSpacing}>
                        <Text style={styles.label}>Brinco (Obrigatório)</Text>
                        <TextInput
                            style={styles.inputBase}
                            value={brinco}
                            onChangeText={setBrinco}
                            placeholder="Digite o brinco do animal"/>
                    </View>
                    <View>
                        <Text style={styles.label}>Microchip (Opcional)</Text>
                        <TextInput
                            style={styles.inputBase}
                            value={microchip}
                            onChangeText={setMicrochip}
                            placeholder="Digite o microchip do animal"/>
                    </View>
                </View>

                {/* Características */}
                <Text style={styles.sectionTitle}>Características e Origem</Text>
                <View style={styles.listContainer}>
                    
                    {/* Sexo e Maturidade (Dropdowns lado a lado) */}
                    <View style={styles.row}>
                        
                        {/* Sexo */}
                        <View style={[styles.halfInput, { zIndex: getDropdownZIndex('sexo') }]}>
                            <Text style={styles.dropdownLabel}>Sexo:</Text>
                            <SelectBottomSheet
                                items={[
                                    { label: "Macho", value: "M" },
                                    { label: "Fêmea", value: "F" },
                                ]}
                                value={sexo}
                                onChange={(value) => setSexo(value)}
                                title="Selecionar sexo"
                                placeholder="Selecione"/>
                        </View>
                        
                        {/* Maturidade */}
                        <View style={[styles.halfInput, { zIndex: getDropdownZIndex('maturidade') }]}>
                            <Text style={styles.dropdownLabel}>Maturidade:</Text>
                            <SelectBottomSheet
                                items={[
                                    { label: "Bezerro", value: "B" },
                                    { label: "Novilha", value: "N" },
                                    { label: "Vaca", value: "V" },
                                    { label: "Touro", value: "T" },
                                ]}
                                value={nivelMaturidade}
                                onChange={(value) => setNivelMaturidade(value)}
                                title="Selecionar maturidade"
                                placeholder="Selecione"/>
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
                        <SelectBottomSheet
                            items={racas}
                            value={idRaca}
                            onChange={(value) => setIdRaca(value)}
                            title="Selecionar raça"
                            placeholder="Selecione raça"
                            />
                    </View>
                </View>                
                {/* Características */}
                <Text style={styles.sectionTitle}>Parentesco (Brincos Opcionais)</Text>
                <View style={styles.listContainer}>
                    
                    {/* Sexo e Maturidade (Dropdowns lado a lado) */}
                    <View style={styles.row}></View>
                
                    
                    {/* Parentesco (Floating Labels lado a lado) */}
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Brinco do Pai</Text>
                            <TextInput
                                style={styles.inputBase}
                                value={brincoPai}
                                onChangeText={setBrincoPai}
                                placeholder="Digite o brinco do Pai"/>
                        </View>

                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Brinco da Mãe</Text>
                            <TextInput
                                style={styles.inputBase}
                                value={brincoMae}
                                onChangeText={setBrincoMae}
                                 placeholder="Digite o brinco da Mãe"/>
                        </View>
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
        marginHorizontal: 10,
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
        marginTop: 16,
    },
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
});