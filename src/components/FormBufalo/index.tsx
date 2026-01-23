import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import bufaloService from "../../services/bufaloService";
import { usePropriedade } from "../../context/PropriedadeContext";
import YellowButton from "../Button";

interface FormBufaloProps {
  onSuccess?: () => void;
}

export function FormBufalo({ onSuccess }: FormBufaloProps) {
  const [nome, setNome] = useState("");
  const [brinco, setBrinco] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [dtNascimento, setDtNascimento] = useState<Date | null>(null);
  const [sexo, setSexo] = useState("");
  const [nivelMaturidade, setNivelMaturidade] = useState("");
  const [idRaca, setIdRaca] = useState<number | null>(null);
  const [brincoPai, setBrincoPai] = useState("");
  const [brincoMae, setBrincoMae] = useState("");
  const [id_propriedade, setIdPropriedade] = useState<number | null>(null);

  const [racas, setRacas] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [openSexo, setOpenSexo] = useState(false);
  const [openMaturidade, setOpenMaturidade] = useState(false);
  const [openRaca, setOpenRaca] = useState(false);
  const { propriedadeSelecionada } = usePropriedade();

  useEffect(() => {
    const fetchRacas = async () => {
      try {
        const racasApi = await bufaloService.getRacas();
        setRacas(racasApi);
      } catch (err) {
        console.error("Erro ao buscar raças:", err);
      }
    };
    fetchRacas();
  }, []);

  const handleSave = async () => {
    try {
      // Validar pai
      let idPai: number | null = null;
      if (brincoPai) {
        const { raw } = await bufaloService.getBufalos(propriedadeSelecionada ?? undefined);
        const paiEncontrado = raw.find(
          (b: any) => b.brinco === brincoPai && b.sexo === "M"
        );
        if (!paiEncontrado) {
          Alert.alert("Erro", "Nenhum pai encontrado com esse brinco na propriedade.");
          return;
        }
        idPai = paiEncontrado.id_bufalo;
      }

      // Validar mãe
      let idMae: number | null = null;
      if (brincoMae) {
        const { raw } = await bufaloService.getBufalos(propriedadeSelecionada ?? undefined);
        const maeEncontrada = raw.find(
          (b: any) => b.brinco === brincoMae && b.sexo === "F"
        );
        if (!maeEncontrada) {
          Alert.alert("Erro", "Nenhuma mãe encontrada com esse brinco na propriedade.");
          return;
        }
        idMae = maeEncontrada.id_bufalo;
      }

      if (!propriedadeSelecionada) {
        return <Text>Selecione uma propriedade antes de cadastrar.</Text>;
      }

      const payload = {
        nome,
        brinco,
        microchip,
        dt_nascimento: dtNascimento?.toISOString(),
        sexo,
        nivel_maturidade: nivelMaturidade,
        id_raca: idRaca,
        id_pai: idPai,
        id_mae: idMae,
        status: true,
        categoria: "PA",
        id_propriedade: propriedadeSelecionada
      };

      await bufaloService.createBufalo(payload);
      Alert.alert("Sucesso", "Búfalo cadastrado com sucesso!");
      onSuccess?.();
    } catch (err) {
      console.error("Erro ao salvar búfalo:", err);
      Alert.alert("Erro", "Não foi possível salvar o búfalo.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Dados Básicos</Text>
      <TextInput
        style={styles.inputFull}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.inputFull}
        placeholder="Brinco"
        value={brinco}
        onChangeText={setBrinco}
      />
      <TextInput
        style={styles.inputFull}
        placeholder="Microchip"
        value={microchip}
        onChangeText={setMicrochip}
      />

      <Text style={styles.sectionTitle}>Características</Text>
      <View style={styles.row}>
        <DropDownPicker
          open={openSexo}
          setOpen={setOpenSexo}
          value={sexo}
          setValue={setSexo}
          items={[
            { label: "Macho", value: "M" },
            { label: "Fêmea", value: "F" },
          ]}
          placeholder="Sexo"
          containerStyle={{ flex: 1, marginRight: 8 }}
          listMode="SCROLLVIEW"
          zIndex={5000}
        />
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
          placeholder="Maturidade"
          containerStyle={{ flex: 1, marginLeft: 8 }}
          listMode="SCROLLVIEW"
          zIndex={4000}
        />
      </View>

      <Text style={styles.sectionTitle}>Data de Nascimento</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.inputFull}
      >
        <Text>
          {dtNascimento
            ? dtNascimento.toISOString().split("T")[0]
            : "Selecione a Data"}
        </Text>
      </TouchableOpacity>


      <Text style={styles.sectionTitle}>Raça</Text>
      <DropDownPicker
        open={openRaca}
        setOpen={setOpenRaca}
        value={idRaca}
        setValue={setIdRaca}
        items={racas.map((r) => ({ label: r.nome, value: r.id_raca }))}
        placeholder="Selecione Raça"
        containerStyle={{ marginBottom: 12 }}
        listMode="SCROLLVIEW"
        zIndex={3000}
      />

      <Text style={styles.sectionTitle}>Parentesco</Text>
      <View style={styles.row}>
        <TextInput
          style={{ ...styles.inputFull, flex: 1, marginRight: 8 }}
          placeholder="Brinco do Pai"
          value={brincoPai}
          onChangeText={setBrincoPai}
        />
        <TextInput
          style={{ ...styles.inputFull, flex: 1, marginLeft: 8 }}
          placeholder="Brinco da Mãe"
          value={brincoMae}
          onChangeText={setBrincoMae}
        />
      </View>

      <YellowButton title="Salvar" onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 14,
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 4,
  },
  inputFull: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    justifyContent: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
});
