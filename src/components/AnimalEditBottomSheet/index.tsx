import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ToastAndroid,
    Alert,
    ActivityIndicator,
    Animated,
    Easing,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import bufaloService from "../../services/bufaloService";
import { usePropriedade } from "../../context/PropriedadeContext";
import YellowButton from "../Button";
import { colors } from "../../styles/colors";
import dayjs from "dayjs";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { formatarDataBR } from "../../utils/date";
import SelectBottomSheet from "../SelectBottomSheet";

// ==========================================================
// --- CONFIGURAÇÃO DE CORES (Padrão) ---
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
// --- INTERFACES (Inalteradas) ---
// ==========================================================
interface AnimalInfoItem {
    idBufalo: string;
    nome?: string;
    brinco: string;
    microchip?: string;
    dtNascimento?: string;
    sexo: 'F' | 'M';
    nivelMaturidade?: 'B' | 'N' | 'V' | 'T';
    racaNome?: string;
    idRaca?: string;
    paiNome?: string;
    maeNome?: string;
}

interface AnimalEditBottomSheetProps {
    item: AnimalInfoItem;
    onEditSave: (idBufalo: string, data: any) => Promise<void>;
    onClose: () => void;
}


export const AnimalEditBottomSheet: React.FC<AnimalEditBottomSheetProps> = ({ item, onEditSave, onClose }) => {

    const normalizeParentName = (name: string | undefined): string => {
        if (!name) return "";
        
        const unknownIdentifiers = ["DESCONHECIDO", "N/A", ""]; 
        const normalizedName = name.toUpperCase().trim();
        
        if (unknownIdentifiers.includes(normalizedName)) {
            return "";
        }
        
        return name;
    };

    const { propriedadeSelecionada } = usePropriedade();
    
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["80%", "95%"], []);
    useEffect(() => {
        sheetRef.current?.present();
    }, []);
    const [nome, setNome] = useState(item.nome || "");
    const [brinco, setBrinco] = useState(item.brinco || "");
    const [microchip, setMicrochip] = useState(item.microchip || "");
    const [nivelMaturidade, setNivelMaturidade] = useState(item.nivelMaturidade || "");
    const [idRaca, setIdRaca] = useState(item.idRaca || "");
    
    
    // ESTADO ORIGINAL (com o potencial erro de tipagem no brincoMae)
    const [brincoPai, setBrincoPai] = useState(normalizeParentName(item.paiNome)); 
    const [brincoMae, setBrincoMae] = useState(normalizeParentName(item.maeNome)); 
    
    const [racas, setRacas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Adicionado para o botão

    const [openMaturidade, setOpenMaturidade] = useState(false);
    const [openRaca, setOpenRaca] = useState(false);

    const zIndexMaturidade = openMaturidade ? 4000 : 1000;
    const zIndexRaca = openRaca ? 3000 : 900;
    
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
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            Alert.alert(isError ? "Erro" : "Sucesso", message);
        }
    };
    

    const handleSave = async () => {
        if (isSaving) return;

        if (!propriedadeSelecionada) {
            showToast("ID da Propriedade não encontrado. Não é possível salvar.", true);
            return;
        }
        
        // Validação Mínima
        if (!nome || !brinco || !nivelMaturidade) {
            showToast("Preencha Nome, Brinco e Maturidade.", true);
            return;
        }

        try {
            setIsSaving(true); // Usa isSaving para o botão

            let idPai: number | null = null;
            
            // Validação de Pai (Macho)
            if (brincoPai) {
                const paiEncontrado = await bufaloService.getBufaloByBrincoAndSexo(
                    propriedadeSelecionada, brincoPai, "M"
                );
                if (!paiEncontrado) {
                    showToast(`Nenhum pai encontrado com brinco '${brincoPai}' (Macho) na propriedade.`, true);
                    setIsSaving(false);
                    return;
                }
                idPai = paiEncontrado.id || paiEncontrado.id_bufalo;
            }

            let idMae: number | null = null;
            
            // Validação de Mãe (Fêmea)
            if (brincoMae) {
                const maeEncontrada = await bufaloService.getBufaloByBrincoAndSexo(
                    propriedadeSelecionada, brincoMae, "F"
                );
                if (!maeEncontrada) {
                    showToast(`Nenhuma mãe encontrada com brinco '${brincoMae}' (Fêmea) na propriedade.`, true);
                    setIsSaving(false);
                    return;
                }
                idMae = maeEncontrada.id || maeEncontrada.id_bufalo;
            }

            const payload = {
                nome,
                brinco,
                microchip,
                nivel_maturidade: nivelMaturidade,
                id_raca: idRaca,
                id_pai: idPai,
                id_mae: idMae,
            };
            // Chama a função passada pela tela pai para persistir e recarregar
            await onEditSave(item.idBufalo, payload); 
            showToast("Informações atualizadas com sucesso!");
            
        } catch (err) {
            console.error("Erro ao atualizar búfalo:", err);
            showToast("Não foi possível salvar as alterações.", true);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading && racas.length === 0) { 
        return (
            <BottomSheetModal
                ref={sheetRef}
                index={0}
                snapPoints={snapPoints}
                onChange={handleSheetChange}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
                backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="none" />}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={mergedColors.primary.base} />
                    <Text style={{ marginTop: 10, color: mergedColors.text.secondary }}>Carregando dados...</Text>
                </View>
            </BottomSheetModal>
        );
    }


    return (
        <BottomSheetModal
            ref={sheetRef}
            index={0}
            name="EditAnimalModal"
            snapPoints={snapPoints}
            onChange={handleSheetChange}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
            stackBehavior="push"
            backdropComponent={(props) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    pressBehavior="none"
                    enableTouchThrough={true}
                />
            )}
        >
            <BottomSheetScrollView contentContainerStyle={styles.scrollContainer} nestedScrollEnabled={true}>
                
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Editar Animal: {item.brinco}</Text>
                </View>
                
                {/* --- Dados Básicos --- */}
                <Text style={styles.sectionTitle}>Dados Básicos</Text>
                <View style={styles.listContainer}>
                    <Text style={styles.label}>Nome</Text>
                    <TextInput
                        style={styles.inputBase}
                        value={nome}
                        onChangeText={setNome}
                        placeholder="Digite o nome do animal"/>
                    <Text style={styles.label}>Brinco</Text>
                    <TextInput
                        style={styles.inputBase}
                        value={brinco}
                        onChangeText={setBrinco}
                        placeholder="Digite o brinco do animal"/>
                    <Text style={styles.label}>Microchip</Text>
                    <TextInput
                        style={styles.inputBase}
                        value={microchip}
                        onChangeText={setMicrochip}
                        placeholder="Digite o microchip do animal"/>
                </View>
                
                {/* --- Características --- */}
                <Text style={styles.sectionTitle}>Características</Text>
                <View style={styles.listContainer}>
                    
                    {/* Campo Sexo (Não Editável) */}
                    <Text style={styles.label}>Sexo</Text>
                    <TextInput
                        style={[styles.inputBase, styles.inputDisabled]}
                        value={item.sexo === 'F' ? 'Fêmea' : 'Macho'}
                        onChangeText={() => {}}
                        editable={false}
                        pointerEvents="none"
                        placeholder="Digite o sexo do animal"/>
  
                    {/* Data de Nascimento (Não Editável) */}
                    <Text style={styles.label}>Data de Nascimento</Text>
                    <TextInput
                        style={[styles.inputBase, styles.inputDisabled]}
                        value={item.dtNascimento ? formatarDataBR(item.dtNascimento) : "Não informado"}
                        onChangeText={() => {}}
                        editable={false}
                        placeholder="Digite a data de nascimento do animal"/>

                    {/* Dropdown Maturidade */}
                    <View style={{ zIndex: zIndexMaturidade, marginBottom: 12 }}>
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
                    
                    <View style={{ zIndex: zIndexRaca, marginBottom: 12 }}>
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

                {/* --- Parentesco --- */}
                <Text style={styles.sectionTitle}>Parentesco (Brinco)</Text>
                <View style={styles.listContainer}>
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
                        title={isSaving ? "Salvando..." : "Salvar Alterações"} 
                        onPress={handleSave} 
                        disabled={isSaving}
                    />
                </View>

            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

// ==========================================================
// --- ESTILOS (UNIFICADOS E ADAPTADOS) ---
// ==========================================================

const styles = StyleSheet.create({

    halfInput: {
        flex: 1,
    },
    row: { 
        flexDirection: "row", 
        justifyContent: "space-between", 
        marginBottom: 0, // O espaçamento está dentro dos Floating Labels (inputContainer)
        gap: 16,
    },
    // Estilos do BottomSheet
    sheetBackground: { backgroundColor: mergedColors.gray.claro, borderRadius: 24 },
    handleIndicator: { backgroundColor: "#D1D5DB", height: 4, width: 36 },

    scrollContainer: { 
        paddingBottom: 40,
        backgroundColor: mergedColors.gray.claro,
    },
    
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
        height: 50, 
    },

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 10,
        padding: 16,
        overflow: "visible", 
        zIndex: 100, 
        marginBottom: 8,
    },
    listLabel: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginBottom: 4,
    },
    
    // --- Estilos do Dropdown ---
    dropdownStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
        height: 50,
        marginBottom: 4, 
    },
    dropdownContainerStyle: { 
        borderColor: mergedColors.border,
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
    loadingContainer: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center" 
    },
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
    dropdownLabel: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
    inputDisabled: {
        backgroundColor: "#f5f5f5",
        color: "#777",
    },
});