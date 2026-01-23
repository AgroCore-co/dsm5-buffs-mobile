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
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DropDownPicker from "react-native-dropdown-picker";
import "dayjs/locale/pt-br"; 
import { usePropriedade } from "../../context/PropriedadeContext";
import bufaloService from "../../services/bufaloService";
import { createReproducao } from "../../services/reproducaoService";

import { colors } from "../../styles/colors";
import YellowButton from "../Button";

// Configuração de cores (Copiada do seu exemplo)
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
// --- FLOATING LABEL INPUT COMPONENT (Copiado/Inalterado) ---
// ==========================================================

interface FloatingLabelInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    editable?: boolean;
    style?: any; 
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

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
        paddingTop: 15,
        textAlignVertical: 'center',
    },
});

const InputWithFloatingLabel: React.FC<FloatingLabelInputProps> = ({
    label,
    value,
    onChangeText,
    editable = true,
    style,
    keyboardType = 'default'
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
                    floatingStyles.inputBase, 
                    { 
                        borderColor: borderColor, 
                        backgroundColor: backgroundColor,
                        color: editable ? mergedColors.text.primary : mergedColors.gray.base,
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={editable}
                placeholderTextColor="transparent"
                keyboardType={keyboardType}
            />
        </View>
    );
};

// ==========================================================
// --- NOVO COMPONENTE: REPRODUCAO ADD BOTTOM SHEET ---
// ==========================================================

interface ReproducaoAddBottomSheetProps {
  onSuccess?: () => void; 
  onClose: () => void;
}

export const ReproducaoAddBottomSheet: React.FC<
  ReproducaoAddBottomSheetProps
> = ({ onClose, onSuccess }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { propriedadeSelecionada } = usePropriedade();
  const { getBufaloByBrincoAndSexo } = bufaloService; // Assumindo o bufaloService.ts
  // SnapPoints ajustados para acomodar mais campos
  const snapPoints = useMemo(() => ["70%", "90%"], []); 

  // Estado do Formulário
  const [tagBufalo, setTagBufalo] = useState("");
  const [tagBufala, setTagBufala] = useState("");
  const [idOvulo, setIdOvulo] = useState("");
  const [idSemen, setIdSemen] = useState("");
  const [tipoInseminacao, setTipoInseminacao] = useState<string | null>(null);
  
  // O status padrão é "Em andamento" e não é alterável no ADD
  const status = "Em andamento"; 

  const [openTipo, setOpenTipo] = useState(false);
  
  // ZIndex para garantir que o Dropdown que está aberto fique por cima
  const zIndexTipo = openTipo ? 200 : 100;

  const tipoItems = useMemo(() => [
    { label: "IATF", value: "IATF" },
    { label: "IA (Inseminação Artificial)", value: "IA" },
    { label: "Monta Natural", value: "Monta Natural" },
  ], []);

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
    if (!propriedadeSelecionada) {
      return showToast("Selecione uma propriedade ativa antes de cadastrar.", true);
    }
    
    if (!tagBufala || !tipoInseminacao) {
      return showToast("Preencha a Tag da Búfala e o Tipo de Inseminação.", true);
    }

    let idBufaloMachoUUID: string | null = null; // Armazenará o UUID do macho
    let idBufalaFemeaUUID: string | null = null; // Armazenará o UUID da fêmea
    let idOvuloUsado = idOvulo || null;
    let idSemenUsado = idSemen || null;
    let brincoInvalido = null;

    try {
        // --- 1. Validação e Obtenção do UUID da Búfala Receptora (Fêmea) ---
        const bufalaFemea = await getBufaloByBrincoAndSexo(
            propriedadeSelecionada,
            tagBufala, // Busca pelo Brinco
            "F"
        );
        
        if (!bufalaFemea || !bufalaFemea.id_bufalo) { // Assumindo que o ID é 'id_bufalo' no objeto retornado
            brincoInvalido = tagBufala;
            return showToast(`Erro: Búfala receptora (Tag: ${brincoInvalido}) não encontrada, não é fêmea, ou o ID interno está faltando.`, true);
        }
        // 🎯 CAPTURA O UUID DA FÊMEA
        idBufalaFemeaUUID = bufalaFemea.id_bufalo; 

        // --- 2. Validação e Obtenção do UUID do Búfalo (Macho) para Monta Natural ---
        if (tipoInseminacao === "Monta Natural") { // Usando o valor CORRETO
            if (!tagBufalo) {
                return showToast("O Búfalo Macho é obrigatório para Monta Natural.", true);
            }
            
            const bufaloMacho = await getBufaloByBrincoAndSexo(
                propriedadeSelecionada,
                tagBufalo, // Busca pelo Brinco
                "M"
            );
            
            if (!bufaloMacho || !bufaloMacho.id_bufalo) {
                brincoInvalido = tagBufalo;
                return showToast(`Erro: Búfalo macho (Tag: ${brincoInvalido}) não encontrado, não é macho, ou o ID interno está faltando.`, true);
            }
            // 🎯 CAPTURA O UUID DO MACHO
            idBufaloMachoUUID = bufaloMacho.id_bufalo; 
            
            // Limpa sêmen/óvulo, pois é Monta Natural
            idSemenUsado = null;
            idOvuloUsado = null;

        } else {
            // Se for IA, IATF ou TE, o campo do Búfalo Macho (brinco) não deve ser enviado como UUID
            idBufaloMachoUUID = null; 
        }

        // --- 3. Preparação do Payload Final ---
        const payload = {
            id_propriedade: propriedadeSelecionada,
            // 🎯 ENVIANDO OS UUIDs (corrigindo o erro 1 e 2)
            id_bufalo: idBufaloMachoUUID,      // UUID do Touro (se Monta Natural)
            id_bufala: idBufalaFemeaUUID,      // UUID da Búfala
            
            id_semen: idSemenUsado,            // ID do Sêmen
            id_doadora: idOvuloUsado,          // ID do Óvulo (assumindo que id_doadora = id_ovulo na API)
            
            // 🎯 ENVIANDO O VALOR CORRETO (corrigindo o erro 3)
            tipo_inseminacao: tipoInseminacao, 
            status: status,
            dt_evento: new Date().toISOString().split("T")[0], 
        };
        // ... (restante da chamada da API)
        await createReproducao(payload);
        showToast("Reprodução cadastrada com sucesso!");
        onSuccess?.();
        onClose();

    } catch (error: any) {
        const errorMessage = brincoInvalido
            ? `Falha na validação do animal. Verifique o Brinco ${brincoInvalido}.`
            : error?.message || "Não foi possível cadastrar a reprodução. Verifique os dados.";

        console.error("Erro ao salvar:", error);
        showToast(errorMessage, true);
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
          pressBehavior="close" 
        />
      )}
    >
      <BottomSheetScrollView 
        contentContainerStyle={styles.container} 
        // Scroll habilitado se o dropdown não estiver aberto
        scrollEnabled={!openTipo}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Nova Reprodução</Text>
        </View>

        {/* --- Animais --- */}
        <Text style={styles.sectionTitle}>Animais</Text>

        <View style={styles.listContainer}>
            <InputWithFloatingLabel
                label="Tag do Búfalo (Macho/Touro)"
                value={tagBufalo}
                onChangeText={setTagBufalo}
            />
            <InputWithFloatingLabel
                label="Tag da Búfala (Fêmea Receptora)"
                value={tagBufala}
                onChangeText={setTagBufala}
            />
        </View>

        {/* --- Tipo de Inseminação --- */}
        <Text style={styles.sectionTitle}>Tipo e Status</Text>
        
        <View style={styles.listContainer}>
            {/* Dropdown Tipo de Inseminação */}
            <View style={{ zIndex: zIndexTipo, marginBottom: 12 }}>
                <Text style={styles.dropdownLabel}>Tipo de Inseminação:</Text>
                <DropDownPicker
                    open={openTipo}
                    value={tipoInseminacao}
                    items={tipoItems}
                    setOpen={setOpenTipo}
                    setValue={setTipoInseminacao}
                    placeholder="Selecione o tipo"
                    style={styles.dropdownStyle}
                    containerStyle={styles.dropdownContainerStyle} 
                    dropDownContainerStyle={styles.dropdownContainerStyle}
                    listMode="MODAL"
                />
            </View>
            
            {/* Campo Status (Não Editável) */}
            <InputWithFloatingLabel
                label="Status Inicial"
                value={status}
                onChangeText={() => {}} // Não editável
                editable={false}
            />
        </View>
        
        {/* --- Extras (Opcional) --- */}
        <Text style={styles.sectionTitle}>Material Genético (Opcional)</Text>
        
        <View style={styles.listContainer}>
            <InputWithFloatingLabel
                label="ID do Óvulo (se for FIV)"
                value={idOvulo}
                onChangeText={setIdOvulo}
            />
            <InputWithFloatingLabel
                label="ID do Sêmen (se for IA)"
                value={idSemen}
                onChangeText={setIdSemen}
                keyboardType="numeric"
            />
        </View>

        {/* Footer (Botões Salvar e Cancelar) */}
        <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <YellowButton title="Salvar Reprodução" onPress={handleSave} />
        </View>

      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ==========================================================
// --- ESTILOS (Adaptados e Consolidados) ---
// ==========================================================

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

    // --- Estilos da Lista e Itens ---
    listContainer: {
        backgroundColor: mergedColors.white.base,
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        overflow: "visible", 
        zIndex: 100, // ZIndex padrão para o conteúdo
        marginBottom: 8,
    },
    
    // --- Estilos do Dropdown (Padrão) ---
    dropdownLabel: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "500",
        marginBottom: 4,
    },
    dropdownStyle: {
        borderColor: mergedColors.border,
        backgroundColor: mergedColors.white.base,
        height: 50,
    },
    dropdownContainerStyle: { 
        borderColor: mergedColors.border,
        height: 50,
    },
    
    // --- Footer ---
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: mergedColors.border,
        marginTop: 16,
    },
    cancelButton: { 
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    cancelText: { 
        color: mergedColors.red.base, 
        fontWeight: "bold",
        fontSize: 16,
    },
});