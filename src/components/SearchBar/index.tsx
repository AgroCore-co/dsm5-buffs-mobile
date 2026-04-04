import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import YellowButton from "../Button";
import bufaloService from "../../services/bufaloService";

// Tipagem idêntica à sua
type Filtros = {
  brinco?: string;
  sexo?: "M" | "F";
  nivel_maturidade?: "B" | "N" | "V" | "T";
  status?: boolean;
  id_raca?: string;
};

interface Props {
  filtros: Filtros;
  onFiltrar: (f: Filtros) => void;
  onClose: () => void;
}

export default function FiltroRebanhoBottomSheet({ filtros, onFiltrar, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "90%"], []);

  const [racas, setRacas] = useState<any[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>("Sexo");
  const [sexo, setSexo] = useState<string | null>(null);
  const [raca, setRaca] = useState<string | null>(null);
  const [maturidade, setMaturidade] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const categorias = ["Sexo", "Raça", "Maturidade", "Status"];
  const opcoes: Record<string, string[]> = {
    Sexo: ["Macho", "Fêmea"],
    Raça: racas.map((r) => r.nome),
    Maturidade: ["Bezerro", "Novilha", "Vaca", "Touro"],
    Status: ["Ativo", "Inativo"],
  };

  useEffect(() => {
    bufaloService.getRacas().then(data => setRacas(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    // Quando o modal abre, preenchemos os estados internos com o que já existe no "pai"
    if (filtros.sexo) setSexo(filtros.sexo === "M" ? "Macho" : "Fêmea");

    if (filtros.nivel_maturidade) {
      const reverseMap: any = { B: "Bezerro", N: "Novilha", V: "Vaca", T: "Touro" };
      setMaturidade(reverseMap[filtros.nivel_maturidade]);
    }

    if (filtros.status !== undefined) setStatus(filtros.status ? "Ativo" : "Inativo");

    if (filtros.id_raca && racas.length > 0) {
      const r = racas.find(x => (x.id_raca ?? x.id) === filtros.id_raca);
      if (r) setRaca(r.nome);
    }
  }, [filtros, racas]);

  const aplicar = () => {
    const payload: Filtros = {};
    if (sexo) payload.sexo = sexo === "Macho" ? "M" : "F";
    if (maturidade) {
      const map: any = { Bezerro: "B", Novilha: "N", Vaca: "V", Touro: "T" };
      payload.nivel_maturidade = map[maturidade];
    }
    if (status) payload.status = status === "Ativo";
    if (raca) {
      const r = racas.find(x => x.nome === raca);
      payload.id_raca = r?.id_raca ?? r?.id;
    }
    onFiltrar(payload);
    onClose();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
      backgroundStyle={{ backgroundColor: "#F8F7F5" }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Filtros Avançados</Text>
          <TouchableOpacity onPress={() => { setSexo(null); setRaca(null); setMaturidade(null); setStatus(null); }}>
            <Text style={{ color: colors.red.base }}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>CATEGORIAS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, categoriaAtiva === cat && styles.chipAtivo]}
              onPress={() => setCategoriaAtiva(cat)}
            >
              <Text style={[styles.chipText, categoriaAtiva === cat && styles.chipTextAtivo]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.optionsGrid}>
          {opcoes[categoriaAtiva!]?.map(opcao => {
            const isSel = [sexo, raca, maturidade, status].includes(opcao);
            return (
              <TouchableOpacity
                key={opcao}
                style={[styles.opt, isSel && styles.optAtivo]}
                onPress={() => {
                  if (categoriaAtiva === "Sexo") setSexo(sexo === opcao ? null : opcao);
                  if (categoriaAtiva === "Raça") setRaca(raca === opcao ? null : opcao);
                  if (categoriaAtiva === "Maturidade") setMaturidade(maturidade === opcao ? null : opcao);
                  if (categoriaAtiva === "Status") setStatus(status === opcao ? null : opcao);
                }}
              >
                <Text style={[styles.optText, isSel && styles.optTextAtivo]}>{opcao}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <YellowButton title="Aplicar Filtros" onPress={aplicar} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 12, color: '#666', marginBottom: 10, fontWeight: '600' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EEE', borderRadius: 12, marginRight: 8 },
  chipAtivo: { backgroundColor: colors.yellow.base },
  chipText: { fontWeight: '500' },
  chipTextAtivo: { color: colors.brown.base },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  opt: { width: '47%', padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  optAtivo: { borderColor: colors.yellow.base, backgroundColor: '#FFF9E7' },
  optText: { color: '#444' },
  optTextAtivo: { fontWeight: 'bold', color: colors.brown.base }
});