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
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";

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
// --- FLOATING LABEL INPUT COMPONENT (Replicado) ---
// ==========================================================

interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    editable?: boolean;
    style?: any;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    multiline?: boolean;
}

// Estilos de suporte para o Floating Label
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
});

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label,
    value,
    onChangeText,
    editable = true,
    style,
    keyboardType = 'default',
    multiline = false,
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
            outputRange: [mergedColors.gray.base, isFocused ? mergedColors.primary.base : mergedColors.gray.base],
        }),
    };

    const borderColor = isFocused ? mergedColors.primary.base : mergedColors.border;
    const backgroundColor = editable ? mergedColors.white.base : mergedColors.gray.claro;

    return (
        <View style={[floatingStyles.inputContainer, style]}>
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
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={editable}
                placeholderTextColor="transparent"
                keyboardType={keyboardType}
                multiline={multiline}
            />
        </View>
    );
};

// ==========================================================
// --- INTERFACES (Inalteradas) ---
// ==========================================================
interface AnimalInfoItem {
    id_bufalo: number;
    nome?: string;
    brinco: string;
    microchip?: string;
    dt_nascimento?: string;
    sexo: 'F' | 'M';
    nivel_maturidade?: 'B' | 'N' | 'V' | 'T';
    racaNome?: string;
    id_raca?: number;
    paiNome?: string;
    maeNome?: string;
}

interface AnimalEditBottomSheetProps {
    item: AnimalInfoItem;
    onEditSave: (id_bufalo: number, data: any) => Promise<void>;
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
    
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["80%", "95%"], []);
    
    const [nome, setNome] = useState(item.nome || "");
    const [brinco, setBrinco] = useState(item.brinco || "");
    const [microchip, setMicrochip] = useState(item.microchip || "");
    const [nivelMaturidade, setNivelMaturidade] = useState(item.nivel_maturidade || "");
    const [idRaca, setIdRaca] = useState<number | null>(item.id_raca || null);
    
    // ESTADO ORIGINAL (com o potencial erro de tipagem no brincoMae)
    const [brincoPai, setBrincoPai] = useState(normalizeParentName(item.paiNome)); 
    const [brincoMae, setBrincoMae] = useState(normalizeParentName(item.paiNome)); // MANTIDO O CÓDIGO ORIGINAL COM O item.paiNome
    
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
                const racasApi = await bufaloService.getRacas();
                setRacas(racasApi);
            } catch (err) {
                console.error("Erro ao buscar raças:", err);
                Alert.alert("Erro", "Não foi possível carregar a lista de raças.");
            } finally {
                setLoading(false);
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
            await onEditSave(item.id_bufalo, payload); 
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
            <BottomSheet
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
            </BottomSheet>
        );
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
            <BottomSheetScrollView contentContainerStyle={styles.scrollContainer} nestedScrollEnabled={true}>
                
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Editar Animal: {item.brinco}</Text>
                </View>
                
                {/* --- Dados Básicos --- */}
                <Text style={styles.sectionTitle}>Dados Básicos</Text>
                <View style={styles.listContainer}>
                    <InputWithFloatingLabel label="Nome" value={nome} onChangeText={setNome} />
                    <InputWithFloatingLabel label="Brinco" value={brinco} onChangeText={setBrinco} />
                    <InputWithFloatingLabel label="Microchip" value={microchip} onChangeText={setMicrochip} />
                </View>
                
                {/* --- Características --- */}
                <Text style={styles.sectionTitle}>Características</Text>
                <View style={styles.listContainer}>
                    
                    {/* Campo Sexo (Não Editável) */}
                    <InputWithFloatingLabel
                        label="Sexo"
                        value={item.sexo === 'F' ? 'Fêmea' : 'Macho'}
                        onChangeText={() => {}}
                        editable={false}
                    />

                    {/* Data de Nascimento (Não Editável) */}
                    <InputWithFloatingLabel
                        label="Data de Nascimento"
                        value={item.dt_nascimento ? dayjs(item.dt_nascimento).format("DD/MM/YYYY") : "Não informado"}
                        onChangeText={() => {}}
                        editable={false}
                    />

                    {/* Dropdown Maturidade */}
                    <View style={{ zIndex: zIndexMaturidade, marginBottom: 12 }}>
                        <Text style={styles.listLabel}>Nível de Maturidade:</Text>
                        <DropDownPicker
                            open={openMaturidade}
                            setOpen={setOpenMaturidade}
                            value={nivelMaturidade}
                            setValue={setNivelMaturidade}
                            items={[
                                { label: "Bezerro (B)", value: "B" },
                                { label: "Novilha (N)", value: "N" },
                                { label: "Vaca (V)", value: "V" },
                                { label: "Touro (T)", value: "T" },
                            ]}
                            placeholder="Selecione Maturidade"
                            listMode="SCROLLVIEW"
                            zIndex={4000}
                            style={styles.dropdownStyle}
                            dropDownContainerStyle={styles.dropdownContainerStyle}
                        />
                    </View>
                </View>
                
                {/* --- Raça --- */}
                <Text style={styles.sectionTitle}>Raça</Text>
                <View style={styles.listContainer}>
                    <View style={{ zIndex: zIndexRaca, marginBottom: 12 }}>
                        <Text style={styles.listLabel}>Raça:</Text>
                        <DropDownPicker
                            open={openRaca}
                            setOpen={setOpenRaca}
                            value={idRaca}
                            setValue={setIdRaca}
                            items={racas.map(r => ({ label: r.nome, value: r.id_raca }))}
                            placeholder="Selecione Raça"
                            listMode="SCROLLVIEW"
                            zIndex={3000}
                            style={styles.dropdownStyle}
                            dropDownContainerStyle={styles.dropdownContainerStyle}
                        />
                    </View>
                </View>

                {/* --- Parentesco --- */}
                <Text style={styles.sectionTitle}>Parentesco (Brinco)</Text>
                <View style={styles.listContainer}>
                    <InputWithFloatingLabel 
                        label="Brinco do Pai (Macho)" 
                        value={brincoPai} 
                        onChangeText={setBrincoPai} 
                    />
                    <InputWithFloatingLabel 
                        label="Brinco da Mãe (Fêmea)" 
                        value={brincoMae} 
                        onChangeText={setBrincoMae} 
                    />
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
        </BottomSheet>
    );
};

// ==========================================================
// --- ESTILOS (UNIFICADOS E ADAPTADOS) ---
// ==========================================================

const styles = StyleSheet.create({
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
        marginHorizontal: 16,
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
});