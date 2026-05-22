import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform as RNPlatform,
  ToastAndroid,
  Alert,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { usePropriedade } from "../../context/PropriedadeContext";
import bufaloService from "../../services/bufaloService";
import { createReproducao, getMaterialGenetico } from "../../services/reproducaoService";

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
  const [matGeneticoSemen, setMatGeneticoSemen] = useState<{ id: string; label: string; idBufalOrigem?: string | null }[]>([]);
  const [matGeneticoOvulo, setMatGeneticoOvulo] = useState<{ id: string; label: string; idBufalOrigem?: string | null }[]>([]);
  const [idSemenSelecionado, setIdSemenSelecionado] = useState<string | null>(null);
  const [idOvuloSelecionado, setIdOvuloSelecionado] = useState<string | null>(null);
  const [tipoInseminacao, setTipoInseminacao] = useState<string | null>(null);
  
  // O status padrão é "Em andamento" e não é alterável no ADD
  const status = "Em andamento"; 

  const tipoItems = useMemo(() => [
    { label: "IATF", value: "IATF" },
    { label: "IA (Inseminação Artificial)", value: "IA" },
    { label: "TE (Transferência de Embrião)", value: "TE" },
    { label: "Monta Natural", value: "Monta Natural" },
  ], []);

  useEffect(() => {
    if (!propriedadeSelecionada) return;
    getMaterialGenetico(propriedadeSelecionada).then((mats) => {
      const tipoFiv = (t: string) =>
        t.includes('vulo') || t.includes('embri'); // óvulo / ovulo / embrião / embriao
      const fiv = mats.filter(m => tipoFiv(m.tipo.toLowerCase()));
      // tudo que não é óvulo/embrião vai para sêmen (inclui sem tipo)
      const semen = mats.filter(m => !tipoFiv(m.tipo.toLowerCase()));
      setMatGeneticoSemen(semen);
      setMatGeneticoOvulo(fiv);
    }).catch(() => {});
  }, [propriedadeSelecionada]);

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

    if ((tipoInseminacao === "IA" || tipoInseminacao === "IATF") && !idSemenSelecionado) {
      return showToast(`${tipoInseminacao} requer a seleção de um Sêmen.`, true);
    }
    if (tipoInseminacao === "TE" && !idSemenSelecionado) {
      return showToast("TE requer a seleção de um Sêmen.", true);
    }
    if (tipoInseminacao === "TE" && !idOvuloSelecionado) {
      return showToast("TE requer a seleção de um Óvulo / Embrião (doadora).", true);
    }

    let idBufaloMachoUUID: string | null = null; // Armazenará o UUID do macho
    let idBufalaFemeaUUID: string | null = null; // Armazenará o UUID da fêmea
    let idOvuloUsado = idOvuloSelecionado || null;
    let idSemenUsado = idSemenSelecionado || null;
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
        // IA/IATF: idSemen obrigatório, sem idDoadora
        // TE: idSemen (sêmen) + idDoadora (material de óvulo/embrião) ambos obrigatórios
        // Monta Natural: idBufalo, sem material genético
        const payload = {
            idPropriedade: propriedadeSelecionada,
            idBufalo: idBufaloMachoUUID,
            idBufala: idBufalaFemeaUUID,
            idSemen: idSemenUsado,
            idDoadora: tipoInseminacao === 'TE' ? (idOvuloSelecionado ?? null) : null,
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
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Nova Reprodução</Text>
        </View>

        {/* --- Tipo de Inseminação (primeiro para guiar os campos seguintes) --- */}
        <Text style={styles.sectionTitle}>Tipo de Inseminação</Text>

        <View style={styles.listContainer}>
          <SelectBottomSheet
            items={tipoItems}
            value={tipoInseminacao}
            onChange={(val: any) => {
              setTipoInseminacao(val);
              // limpa campos do tipo anterior
              setTagBufalo('');
              setIdSemenSelecionado(null);
              setIdOvuloSelecionado(null);
            }}
            title="Selecione o Tipo de Inseminação"
            placeholder="Selecione o Tipo de Inseminação"
          />
        </View>

        {/* --- Animais --- */}
        <Text style={styles.sectionTitle}>Animais</Text>

        <View style={styles.listContainer}>
          {/* Macho só aparece para Monta Natural */}
          {tipoInseminacao === "Monta Natural" && (
            <>
              <Text style={styles.label}>Tag do Búfalo Macho <Text style={{ color: mergedColors.red.base }}>*</Text></Text>
              <TextInput
                style={styles.inputBase}
                value={tagBufalo}
                onChangeText={setTagBufalo}
                placeholder="Digite a tag do búfalo macho"
              />
            </>
          )}

          <Text style={styles.label}>
            Tag da Búfala {tipoInseminacao === "Monta Natural" ? "(Fêmea Receptora)" : "(Receptora/Gestora)"}
            {" "}<Text style={{ color: mergedColors.red.base }}>*</Text>
          </Text>
          <TextInput
            style={styles.inputBase}
            value={tagBufala}
            onChangeText={setTagBufala}
            placeholder="Digite a tag da búfala"
          />
        </View>

        {/* --- Material Genético: IA/IATF = Sêmen obrigatório --- */}
        {(tipoInseminacao === "IA" || tipoInseminacao === "IATF") && (
          <>
            <Text style={styles.sectionTitle}>Material Genético</Text>
            <View style={styles.listContainer}>
              <Text style={styles.label}>
                Sêmen <Text style={{ color: mergedColors.red.base }}>*</Text>
              </Text>
              {matGeneticoSemen.length === 0 ? (
                <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
                  Nenhum sêmen cadastrado — sincronize primeiro.
                </Text>
              ) : (
                <SelectBottomSheet
                  items={matGeneticoSemen.map(m => ({ label: m.label, value: m.id }))}
                  value={idSemenSelecionado}
                  onChange={(val: any) => setIdSemenSelecionado(val)}
                  title="Selecionar Sêmen"
                  placeholder="Selecione o Sêmen"
                />
              )}
            </View>
          </>
        )}

        {/* --- Material Genético: TE = Sêmen + Óvulo/Embrião (doadora) obrigatórios --- */}
        {tipoInseminacao === "TE" && (
          <>
            <Text style={styles.sectionTitle}>Material Genético</Text>
            <View style={styles.listContainer}>
              <Text style={styles.label}>
                Sêmen <Text style={{ color: mergedColors.red.base }}>*</Text>
              </Text>
              {matGeneticoSemen.length === 0 ? (
                <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
                  Nenhum sêmen cadastrado — sincronize primeiro.
                </Text>
              ) : (
                <SelectBottomSheet
                  items={matGeneticoSemen.map(m => ({ label: m.label, value: m.id }))}
                  value={idSemenSelecionado}
                  onChange={(val: any) => setIdSemenSelecionado(val)}
                  title="Selecionar Sêmen"
                  placeholder="Selecione o Sêmen"
                />
              )}

              <Text style={styles.label}>
                Óvulo / Embrião (Doadora) <Text style={{ color: mergedColors.red.base }}>*</Text>
              </Text>
              {matGeneticoOvulo.length === 0 ? (
                <Text style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>
                  Nenhum óvulo/embrião cadastrado — sincronize primeiro.
                </Text>
              ) : (
                <SelectBottomSheet
                  items={matGeneticoOvulo.map(m => ({ label: m.label, value: m.id }))}
                  value={idOvuloSelecionado}
                  onChange={(val: any) => setIdOvuloSelecionado(val)}
                  title="Selecionar Óvulo / Embrião"
                  placeholder="Selecione o Óvulo / Embrião"
                />
              )}
            </View>
          </>
        )}

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