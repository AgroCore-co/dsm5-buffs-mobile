import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { colors } from "../../styles/colors";
import sanitarioService from "../../services/sanitarioService";
import YellowButton from "../Button";

interface FormSanitarioProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  idBufalo: number;
}

export const FormSanitario = ({ onSubmit, onClose, idBufalo }: FormSanitarioProps) => {
  const [doenca, setDoenca] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [unidade, setUnidade] = useState("");
  const [retorno, setRetorno] = useState(false);
  const [dtRetorno, setDtRetorno] = useState("");

  const [medicacoes, setMedicacoes] = useState<any[]>([]);
  const [medicacaoOpen, setMedicacaoOpen] = useState(false);
  const [medicacaoSelecionada, setMedicacaoSelecionada] = useState<number | null>(null);

  useEffect(() => {
    const fetchMedicacoes = async () => {
      try {
        const res = await sanitarioService.getMedicamentos();
        setMedicacoes(res.map((m: any) => ({
          label: m.medicacao,
          value: m.id_medicacao
        })));
      } catch (err) {
        console.error("Erro ao buscar medicações:", err);
      }
    };
    fetchMedicacoes();
  }, []);

  const handleSubmit = async () => {
    if (!medicacaoSelecionada) {
      Alert.alert("Erro", "Selecione uma medicação.");
      return;
    }

    if (!doenca || !dosagem || !unidade) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      id_bufalo: idBufalo,
      id_medicao: medicacaoSelecionada,
      dt_aplicacao: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      dosagem: parseFloat(dosagem),
      unidade_medida: unidade,
      doenca,
      necessita_retorno: retorno,
      dt_retorno: retorno ? dtRetorno || null : null
    };

    try {
      onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Erro ao adicionar histórico sanitário:", err);
      Alert.alert("Erro", "Não foi possível salvar o registro.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Novo Registro Sanitário</Text>

      <TextInput placeholder="Doença" value={doenca} onChangeText={setDoenca} style={styles.input} />
      
      <DropDownPicker
        open={medicacaoOpen}
        setOpen={setMedicacaoOpen}
        value={medicacaoSelecionada}
        setValue={setMedicacaoSelecionada}
        items={medicacoes}
        placeholder="Selecione a Medicação"
        containerStyle={{ marginBottom: 12 }}
        listMode="SCROLLVIEW"
        zIndex={5000}
      />

      <TextInput 
        placeholder="Dosagem" 
        value={dosagem} 
        onChangeText={setDosagem} 
        keyboardType="numeric"
        style={styles.input} 
      />
      <TextInput 
        placeholder="Unidade de medida" 
        value={unidade} 
        onChangeText={setUnidade} 
        style={styles.input} 
      />

      {retorno && (
        <TextInput 
          placeholder="Data de retorno (YYYY-MM-DD)" 
          value={dtRetorno} 
          onChangeText={setDtRetorno} 
          style={styles.input} 
        />
      )}

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text>Necessita retorno?</Text>
        <TouchableOpacity onPress={() => setRetorno(!retorno)} style={{ marginLeft: 10 }}>
          <Text style={{ color: retorno ? colors.status.success : colors.text.muted }}>{retorno ? "Sim" : "Não"}</Text>
        </TouchableOpacity>
      </View>

      <YellowButton title="Registrar" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.border.muted,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: colors.brand.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: colors.text.onDark, fontWeight: "bold" },
});
