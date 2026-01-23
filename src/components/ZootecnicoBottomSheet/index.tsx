import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { ConfirmarExclusaoModal } from "../ModalAlertaDelete";

interface ZootecnicoItem {
    id_zootec: string;
    tipo_pesagem?: string;
    dt_registro?: string;
    peso?: number;
    condicao_corporal?: number;
    cor_pelagem?: string;
    formato_chifre?: string;
    porte_corporal?: string;
}

interface ZootecnicoBottomSheetProps {
    item: ZootecnicoItem;
    onEditSave: (data: ZootecnicoItem) => void;
    onDelete: (id_zootec: string) => void;
    onClose: () => void;
}

export const ZootecnicoBottomSheet: React.FC<ZootecnicoBottomSheetProps> = ({ item, onEditSave, onDelete, onClose }) => {

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["70%", "90%"], []);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<ZootecnicoItem>({ ...item });
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);


    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleChange = (key: keyof ZootecnicoItem, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleEdit = () => {
        if (isEditing) {
            const peso = formData.peso;
            const condicao_corporal = formData.condicao_corporal;
            const cor_pelagem = formData.cor_pelagem;
            const formato_chifre = formData.formato_chifre;
            const porte_corporal = formData.porte_corporal;

            const payloadApi = {
                peso: peso  || 0,
                condicao_corporal: condicao_corporal || 0,              
                cor_pelagem: cor_pelagem || null,
                formato_chifre: formato_chifre || null,
                porte_corporal: porte_corporal || null,
            };
            
            const cleanedPayload = Object.fromEntries(
                Object.entries(payloadApi).filter(([_, value]) => value !== null && value !== undefined)
            );
            
            console.log("PAYLOAD ZOOTÉCNICO LIMPO PARA API:", cleanedPayload);
            onEditSave({ id_zootec: formData.id_zootec, ...cleanedPayload }); 
        }
        setIsEditing(!isEditing);
    };
    
    const handleDelete = () => {
        setIsDeleteModalVisible(true);
    };

    const handleConfirmDelete = () => {
        setIsDeleteModalVisible(false); 
        onDelete(item.id_zootec); 
        onClose();
    }

    const formatDate = (dateString?: string) => {
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
    <BottomSheetScrollView contentContainerStyle={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detalhes do Evento</Text>
      </View>

      {/* Card Principal */}
      <View style={styles.mainCard}>
        <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>
              Registro {String(formData.tipo_pesagem ?? "")}
            </Text>
            <Text style={styles.cardSubtitle}>
              Data do Registro: {formatDate(formData?.dt_registro)}
            </Text>
        </View>
      </View>

      {/* Título da seção */}
      <Text style={styles.sectionTitle}>Detalhes do Animal</Text>

      {/* Lista */}
{/* Lista */}
<View style={styles.listContainer}>
    
    {/* Peso */}
    <View style={styles.listItem}>
      <Text style={styles.listLabel}>Peso</Text>

      {!isEditing ? (
        <Text style={styles.listValue}>{String(formData.peso ?? "-")}</Text>
      ) : (
        <TextInput
          style={styles.inputFull}
          keyboardType="numeric"
          value={String(formData.peso ?? "")}
          onChangeText={(t) => handleChange("peso", t)}
        />
      )}
    </View>

    <View style={styles.listItem}>
      <Text style={styles.listLabel}>Condição Corporal (CC)</Text>

      {!isEditing ? (
        <Text style={styles.listValue}>
          {String(formData.condicao_corporal ?? "-")}
        </Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => handleChange("condicao_corporal", String(n))}
              style={styles.radioItem}
            >
              <View style={styles.radioCircle}>
                {String(formData.condicao_corporal) === String(n) && (
                  <View style={styles.radioSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>

    {/* Pelagem */}
    <View style={styles.listItem}>
      <Text style={styles.listLabel}>Pelagem</Text>

      {!isEditing ? (
        <Text style={styles.listValue}>{formData.cor_pelagem ?? "-"}</Text>
      ) : (
        <TextInput
          style={styles.inputFull}
          value={formData.cor_pelagem ?? ""}
          onChangeText={(t) => handleChange("cor_pelagem", t)}
        />
      )}
    </View>

    {/* Formato Chifre */}
    <View style={styles.listItem}>
      <Text style={styles.listLabel}>Chifre</Text>

      {!isEditing ? (
        <Text style={styles.listValue}>{formData.formato_chifre ?? "-"}</Text>
      ) : (
        <TextInput
          style={styles.inputFull}
          value={formData.formato_chifre ?? ""}
          onChangeText={(t) => handleChange("formato_chifre", t)}
        />
      )}
    </View>

    {/* Porte Corporal */}
    <View style={[styles.listItem, styles.listItemLast]}>
      <Text style={styles.listLabel}>Porte</Text>

      {!isEditing ? (
        <Text style={styles.listValue}>{formData.porte_corporal ?? "-"}</Text>
      ) : (
        <TextInput
          style={styles.inputFull}
          value={formData.porte_corporal ?? ""}
          onChangeText={(t) => handleChange("porte_corporal", t)}
        />
      )}
    </View>
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
            {isEditing ? "Salvar Alterações" : "Editar"}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
    <ConfirmarExclusaoModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Registro Zootécnico"
        message={`Tem certeza que deseja excluir o registro da data ${formatDate(item.dt_registro)}? Esta ação é irreversível.`}
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
    paddingBottom: 16,
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
    marginHorizontal: 20,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
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
    marginStart: 16,
    color: "#6B7280",
  },
  listValue: {
    fontSize: 14,
    color: "#111827",
    textAlign: "right",
    minWidth: 60,
  },

  inputEditable: {

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
    color: "#e71a1aff",
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
    color: colors.brown.base,
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
  inputFull: { 
    width: "40%", 
    borderWidth: 1, 
    borderColor: colors.gray.base, 
    borderRadius: 6, 
    marginBottom: 12,
    backgroundColor: colors.white.base,
    justifyContent: 'center',
  },

});
