// src/components/FormZootecnico.tsx
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../styles/colors";
import YellowButton from "../Button";

interface FormZootecnicoProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export const FormZootecnico = ({ onSubmit, onClose }: FormZootecnicoProps) => {
  const [peso, setPeso] = useState("");
  const [condicao, setCondicao] = useState("");
  const [porte, setPorte] = useState("");
  const [pelagem, setPelagem] = useState("");
  const [tipoPesagem, setTipoPesagem] = useState("");

  const handleSubmit = () => {
    onSubmit({
      peso: Number(peso),
      condicao_corporal: condicao,
      porte_corporal: porte,
      cor_pelagem: pelagem,
      tipo_pesagem: tipoPesagem,
      dt_registro: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Novo Registro Zootécnico</Text>
      <TextInput placeholder="Peso (kg)" value={peso} onChangeText={setPeso} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder="Condição corporal" value={condicao} onChangeText={setCondicao} style={styles.input} />
      <TextInput placeholder="Porte corporal" value={porte} onChangeText={setPorte} style={styles.input} />
      <TextInput placeholder="Pelagem" value={pelagem} onChangeText={setPelagem} style={styles.input} />
      <TextInput placeholder="Tipo de pesagem" value={tipoPesagem} onChangeText={setTipoPesagem} style={styles.input} />

      <YellowButton title="Atualizar" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
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
