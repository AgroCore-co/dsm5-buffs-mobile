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
import SelectBottomSheet from "../SelectBottomSheet";

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
        
        if (!bufalaFemea || !bufalaFemea.idBufalo) { // Assumindo que o ID é 'id_bufalo' no objeto retornado
            brincoInvalido = tagBufala;
            return showToast(`Erro: Búfala receptora (Tag: ${brincoInvalido}) não encontrada, não é fêmea, ou o ID interno está faltando.`, true);
        }
        // 🎯 CAPTURA O UUID DA FÊMEA
        idBufalaFemeaUUID = bufalaFemea.idBufalo; 

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
            
            if (!bufaloMacho || !bufaloMacho.idBufalo) {
                brincoInvalido = tagBufalo;
                return showToast(`Erro: Búfalo macho (Tag: ${brincoInvalido}) não encontrado, não é macho, ou o ID interno está faltando.`, true);
            }
            // 🎯 CAPTURA O UUID DO MACHO
            idBufaloMachoUUID = bufaloMacho.idBufalo; 
            
            // Limpa sêmen/óvulo, pois é Monta Natural
            idSemenUsado = null;
            idOvuloUsado = null;

        } else {
            // Se for IA, IATF ou TE, o campo do Búfalo Macho (brinco) não deve ser enviado como UUID
            idBufaloMachoUUID = null; 
        }

        // --- 3. Preparação do Payload Final ---
        const payload = {
            idPropriedade: propriedadeSelecionada,
            // 🎯 ENVIANDO OS UUIDs (corrigindo o erro 1 e 2)
            idBufalo: idBufaloMachoUUID,      // UUID do Touro (se Monta Natural)
            idBufala: idBufalaFemeaUUID,      // UUID da Búfala
            
            idSemen: idSemenUsado,            // ID do Sêmen
            idDoadora: idOvuloUsado,          // ID do Óvulo (assumindo que id_doadora = id_ovulo na API)
            
            // 🎯 ENVIANDO O VALOR CORRETO (corrigindo o erro 3)
            tipoInseminacao: tipoInseminacao, 
            status: status,
            dtEvento: new Date().toISOString().split("T")[0], 
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
            <Text style={styles.label}>Tag do Búfalo (Macho/Touro)</Text>
            <TextInput
                style={styles.inputBase}
                value={tagBufalo}
                onChangeText={setTagBufalo}
                placeholder="Digite a tag do búfalo"/>

            <Text style={styles.label}>Tag da Búfala (Fêmea Receptora)</Text>
            <TextInput
                style={styles.inputBase}
                value={tagBufala}
                onChangeText={setTagBufala}
                placeholder="Digite a tag da búfala"/>
        </View>

        {/* --- Tipo de Inseminação --- */}
        <Text style={styles.sectionTitle}>Tipo e Status</Text>
        
        <View style={styles.listContainer}>
            {/* Dropdown Tipo de Inseminação */}
            <View style={{ zIndex: zIndexTipo, marginBottom: 12 }}>
                <Text style={styles.label}>Tipo de Inseminação:</Text>
                <SelectBottomSheet
                    items={tipoItems}
                    value={tipoInseminacao}
                    onChange={(val: any) => setTipoInseminacao(val)}
                    title="Selecione o Tipo de Inseminação"
                    placeholder="Selecione o Tipo de Inseminação"
                />
            </View>
            
            {/* Campo Status (Não Editável) */}
            <Text style={styles.label}>Status Inicial</Text>
            <TextInput
                style={[styles.inputBase, styles.inputDisabled]}
                value={status}
                onChangeText={() => {}} // Não editável
                editable={false} />
        </View>
        
        {/* --- Extras (Opcional) --- */}
        <Text style={styles.sectionTitle}>Material Genético (Opcional)</Text>
        
        <View style={styles.listContainer}>
            <Text style={styles.label}>ID do Óvulo (se for FIV)</Text>
            <TextInput
                style={styles.inputBase}
                value={idOvulo}
                onChangeText={setIdOvulo}
                placeholder="Digite o identificador do Óvulo"/>

            <Text style={styles.label}>ID do Sêmen (se for IA)</Text>
            <TextInput
                style={styles.inputBase}
                value={idSemen}
                onChangeText={setIdSemen}
                placeholder="Digite o identificador do Sêmen"/>
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
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
    inputBase: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        borderColor: mergedColors.border,
        paddingHorizontal: 12,
        fontSize: 16,
        color: mergedColors.text.primary,
        backgroundColor: mergedColors.white.base,
        marginBottom: 12
    },
    inputDisabled: {
        backgroundColor: "#f5f5f5",
        color: "#777",
    },  
});