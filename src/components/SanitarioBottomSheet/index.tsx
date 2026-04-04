import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { DatePickerModal } from "../DatePickerModal";
import dayjs from "dayjs";
import DropDownPicker from "react-native-dropdown-picker";
import sanitarioService from "../../services/sanitarioService";
import { ConfirmarExclusaoModal } from "../ModalAlertaDelete";
import { formatarDataBR } from "../../utils/date";

interface SanitarioItem {
    idSanit: string;
    doenca?: string;
    dosagem?: number;
    dtAplicacao?: string;
    dtRetorno?: string;
    idMedicacao?: string;
    nome_medicamento?: string;
    observacao?: string;
    necessitaRetorno?: boolean;
    unidadeMedida?: string;
}

interface SanitarioBottomSheetProps {
    item: SanitarioItem;
    onEditSave: (data: SanitarioItem) => void;
    onClose: () => void;
    onDelete: (id_sanit: string) => void;
    propriedadeId: string;
}

export const SanitarioBottomSheet: React.FC<SanitarioBottomSheetProps> = ({ item, onEditSave, onClose, onDelete, propriedadeId}) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["70%", "90%"], []);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<SanitarioItem>({ ...item });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [medicacoes, setMedicacoes] = useState<{label:string,value:string}[]>([]);
    const [openMedicacao, setOpenMedicacao] = useState(false);
    const [medicacaoSelecionada, setMedicacaoSelecionada] = useState<string | null>(item.idMedicacao || null);
    const [loadingMedicacoes, setLoadingMedicacoes] = useState(true);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    useEffect(() => {
        const fetchMedicacoes = async () => {
          if (!propriedadeId){
            setLoadingMedicacoes(false);
            return;
          }
          setLoadingMedicacoes(true);
          try {
            const data = await sanitarioService.getMedicamentosByPropriedade(propriedadeId);
            
            const mappedData = data.map(g => ({ 
                label: g.medicacao, 
                value: String(g.id_medicacao) 
            }));
            
            setMedicacoes(mappedData);
          } catch (error) {
              console.error("Erro ao carregar medicações:", error);
          } finally {
              // 3. O PONTO CRÍTICO: DESLIGAR O LOADING AQUI!
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

    const handleChange = (key: keyof SanitarioItem, value: SanitarioItem[keyof SanitarioItem]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleEdit = () => {
      if (isEditing) {
        // 1️⃣ idSanit SEMPRE separado
        const idSanit = formData.idSanit;

        // 2️⃣ só os campos que podem mudar
        const payloadParcial: Partial<SanitarioItem> = {
          idMedicacao: medicacaoSelecionada ?? undefined,
          dosagem: formData.dosagem,
          unidadeMedida: formData.unidadeMedida,
          necessitaRetorno: formData.necessitaRetorno,
          dtRetorno: formData.dtRetorno,
        };

        // 3️⃣ remove undefined / null
        const payloadLimpo = Object.fromEntries(
          Object.entries(payloadParcial).filter(
            ([_, value]) => value !== null && value !== undefined
          )
        );

        // 4️⃣ monta o objeto FINAL (AGORA COM idSanit)
        const payloadFinal: SanitarioItem = {
          idSanit,
          ...(payloadLimpo as Omit<SanitarioItem, "idSanit">),
        };

        console.log("📤 Payload FINAL (FRONT):", payloadFinal);
        onEditSave(payloadFinal);
      }

      setIsEditing(!isEditing);
    };

    
    const handleDelete = () => {
        setIsDeleteModalVisible(true);
    };

    const handleConfirmDelete = () => {
        setIsDeleteModalVisible(false); 
        onDelete(item.idSanit); 
        onClose();
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "Nda";
        const parts = dateString.split("T")[0].split("-").reverse();
        return parts.join("/");
    };


return (
  <BottomSheet
    ref={sheetRef}
    index={0}
    snapPoints={snapPoints}
    onChange={handleSheetChange}
    backgroundStyle={{ backgroundColor: "#F8F7F5", borderRadius: 24 }}
    handleIndicatorStyle={{ backgroundColor: "#D1D5DB", height: 4, width: 36 }}
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
    <BottomSheetScrollView contentContainerStyle={styles.container} scrollEnabled={!openMedicacao}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Tratamento Sanitário</Text>
                </View>

                {/* Card Principal */}
                <View style={styles.mainCard}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle}>
                        Doença: {String(formData.doenca ?? "-")}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Aplicado em: {formatarDataBR(formData?.dtAplicacao)}
                      </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Detalhes do Tratamento:</Text>

                {/* Lista */}
                <View style={styles.listContainer}>

                    {/* Nome do medicamento */}
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Medicação:</Text>

                        {!isEditing ? (
                            <Text style={styles.listValue}>{formData.nome_medicamento ?? "-"}</Text>
                        ) : (
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                {loadingMedicacoes ? (
                                    <Text style={styles.listValue}>Carregando medicações...</Text>
                                ) : (
                                    <DropDownPicker
                                        open={openMedicacao}
                                        setOpen={setOpenMedicacao}
                                        value={medicacaoSelecionada}
                                        setValue={setMedicacaoSelecionada }
                                        items={medicacoes}
                                        placeholder="Selecione a Medicação"
                                        containerStyle={{ flex: 1, marginBottom: 16 }}
                                        style={styles.dropdownStyle}
                                        listMode="MODAL"
                                        zIndex={4000}
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    {/* Dosagem */}
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Dosagem:</Text>

                        {!isEditing ? (
                            <Text style={styles.listValue}>
                                {String(formData.dosagem ?? "-")} {formData.unidadeMedida ?? ""}
                            </Text>
                        ) : (
                            <View style={{ flexDirection: "row", gap: 8, left: '15%' }}>
                                <TextInput
                                    style={styles.inputFull1}
                                    keyboardType="numeric"
                                    value={String(formData.dosagem ?? "")}
                                    onChangeText={(t) => handleChange("dosagem", t)}
                                />
                                <TextInput
                                    style={styles.inputFull2}
                                    value={formData.unidadeMedida ?? ""}
                                    onChangeText={(t) => handleChange("unidadeMedida", t)}
                                />
                            </View>
                        )}
                    </View>

                    {/* Necessita retorno */}
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Necessita retorno:</Text>

                        {!isEditing ? (
                            <Text style={styles.listValue}>
                                {formData.necessitaRetorno ? "Sim" : "Não"}
                            </Text>
                        ) : (
                            <Switch
                                value={Boolean(formData.necessitaRetorno)}
                                onValueChange={(v) => handleChange("necessitaRetorno", v)}
                                thumbColor="#FAC638"
                            />
                        )}
                    </View>

                    {/* Retorno (apenas se necessitar) */}
                    {formData.necessitaRetorno && (
                      <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Retorno:</Text>
                        {!isEditing ? (
                          <Text style={styles.listValue}>{formatarDataBR(formData.dtRetorno)}</Text>
                        ) : (
                          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                            <Text style={[styles.listValue, { color: colors.black.base }]}>
                              {formData.dtRetorno ? formatarDataBR(formData.dtRetorno) : "Selecionar"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {!isEditing && (
                        <TouchableOpacity
                            style={[styles.footerBtn, styles.deleteBtn]}
                            onPress={handleDelete}
                        >
                            <Text style={styles.deleteText}>Excluir</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.footerBtn, styles.editBtn]}
                        onPress={toggleEdit}
                    >
                        <Text style={styles.editText}>
                            {isEditing ? "Salvar" : "Editar"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <DatePickerModal
                  visible={showDatePicker}
                  date={formData.dtRetorno}
                  onClose={() => setShowDatePicker(false)}
                  onSelectDate={(selected) => {
                    handleChange("dtRetorno", dayjs(selected).format("YYYY-MM-DD"));
                  }}
                />
    </BottomSheetScrollView>
      <ConfirmarExclusaoModal
          visible={isDeleteModalVisible}
          onClose={() => setIsDeleteModalVisible(false)}
          onConfirm={handleConfirmDelete}
          title="Excluir Registro Sanitário"
          message={`Tem certeza que deseja excluir o registro da doença ${formatDate(item.doenca)}? Esta ação é irreversível.`}
        />
  </BottomSheet>
)};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
    backgroundColor: colors.gray.claro,
  },
  handleWrapper: {
    alignItems: "center",
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  mainCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center"
  },
  cardRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  listContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  listItemLast: {
    borderBottomWidth: 1,
  },
  listIcon: {
    marginRight: 12,
    fontSize: 20,
    color: "#6B7280",
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },
  listValue: {
    fontSize: 14,
    color: "#111827",
    textAlign: "right",
    minWidth: 60,
  },
  inputEditable: {
    borderBottomWidth: 1,
    borderColor: "#FAC638",
    paddingBottom: 2,
  },
  highlightBox: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(250,198,56,0.25)",
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A16207",
  },
  highlightValue: {
    fontSize: 14,
    color: "#78350F",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 16,
  },
  footerBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#FAC638",
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  deleteText: {
    color: "#DC2626",
    fontWeight: "700",
  },
  editText: {
    fontWeight: "700",
    color: "#111827",
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray.base,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FAC638",
  },
  radioLabel: {
    fontSize: 14,
    color: "#111827",
  },
  inputFull1: { 
    width: "35%", 
    borderWidth: 1, 
    borderColor: colors.gray.base, 
    borderRadius: 6, 
    marginBottom: 12,
    backgroundColor: colors.white.base,
    justifyContent: 'center',
  },
  inputFull2: { 
    width: "40%", 
    borderWidth: 1, 
    borderColor: colors.gray.base, 
    borderRadius: 6, 
    marginBottom: 12,
    backgroundColor: colors.white.base,
    justifyContent: 'center',
  },
  dropdownStyle: {
    borderColor: colors.gray.base,
    backgroundColor: colors.white.base,
  },
});
