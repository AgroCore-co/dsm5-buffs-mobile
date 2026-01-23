// src/components/FiltroRebanho.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors } from "../../styles/colors";
import YellowButton from "../Button";
import bufaloService from "../../services/bufaloService";

const mapMaturidade = (valor: string | null) => {
  switch (valor) {
    case "Bezerro":
      return "B";
    case "Novilha":
      return "N";
    case "Vaca":
      return "V";
    case "Touro":
      return "T";
    default:
      return undefined;
  }
};

type Filtros = {
  brinco?: string;
  sexo?: "M" | "F";
  nivel_maturidade?: "B" | "N" | "V" | "T";
  status?: boolean;
  id_raca?: string;
};

export default function FiltroRebanho({
  filtros = {},
  onFiltrar,
}: {
  filtros?: Filtros;
  onFiltrar: (f: Filtros) => void;
}) {
  const categorias = ["Sexo", "Raça", "Maturidade", "Status"];

  // dados externos
  const [racas, setRacas] = useState<any[]>([]);

  // estados locais por categoria (permitem múltiplos filtros simultâneos)
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [sexoSelecionado, setSexoSelecionado] = useState<string | null>(null); // "Macho" | "Fêmea"
  const [racaSelecionada, setRacaSelecionada] = useState<string | null>(null); // nome da raça
  const [maturidadeSelecionada, setMaturidadeSelecionada] = useState<string | null>(null);
  const [statusSelecionado, setStatusSelecionado] = useState<string | null>(null); // "Ativo" | "Inativo"
  const [search, setSearch] = useState<string>("");

  // busca raças
  useEffect(() => {
    (async () => {
      try {
        const data = await bufaloService.getRacas();
        // espera array [{ id_raca?, id?, nome }]
        setRacas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar raças:", err);
      }
    })();
  }, []);

  // inicializa estados locais a partir da prop filtros (persistência)
  useEffect(() => {
    if (!filtros) return;

    if (filtros.brinco) setSearch(filtros.brinco);
    if (filtros.sexo) setSexoSelecionado(filtros.sexo === "M" ? "Macho" : "Fêmea");
    if (filtros.nivel_maturidade) {
      const mapReverse: Record<string, string> = { B: "Bezerro", N: "Novilha", V: "Vaca", T: "Touro" };
      setMaturidadeSelecionada(mapReverse[filtros.nivel_maturidade] ?? null);
    }
    if (filtros.status !== undefined) setStatusSelecionado(filtros.status ? "Ativo" : "Inativo");
    if (filtros.id_raca) {
      const r = racas.find((x) => (x.id_raca ?? x.id) === filtros.id_raca);
      setRacaSelecionada(r?.nome ?? null);
    }
    // não setamos categoriaAtiva aqui pra não abrir nada automaticamente; usuário decide.
  }, [filtros, racas]);

  const opcoesPorCategoria: Record<string, string[]> = {
    Sexo: ["Macho", "Fêmea"],
    Raça: racas.map((r) => r.nome).filter(Boolean),
    Maturidade: ["Bezerro", "Novilha", "Vaca", "Touro"],
    Status: ["Ativo", "Inativo"],
  };

  const getIdDaRaca = (nomeRaca: string | null) => {
    if (!nomeRaca || racas.length === 0) return undefined;
    const racaEncontrada = racas.find((r) => r.nome === nomeRaca);
    return racaEncontrada ? (racaEncontrada.id_raca ?? racaEncontrada.id) : undefined;
  };

  const limparFiltros = () => {
    setSearch("");
    setCategoriaAtiva(null);
    setSexoSelecionado(null);
    setRacaSelecionada(null);
    setMaturidadeSelecionada(null);
    setStatusSelecionado(null);
    onFiltrar({}); // limpa no pai também
  };

  // alterna seleção da opção clicada (toggle)
  const handleSelect = (opcao: string) => {
    switch (categoriaAtiva) {
      case "Sexo":
        setSexoSelecionado((prev) => (prev === opcao ? null : opcao));
        break;
      case "Raça":
        setRacaSelecionada((prev) => (prev === opcao ? null : opcao));
        break;
      case "Maturidade":
        setMaturidadeSelecionada((prev) => (prev === opcao ? null : opcao));
        break;
      case "Status":
        setStatusSelecionado((prev) => (prev === opcao ? null : opcao));
        break;
    }
  };

  // monta objeto final e envia para o pai
  const aplicarFiltro = () => {
    const payload: Filtros = {};

    if (search && search.trim().length) payload.brinco = search.trim();
    if (sexoSelecionado) payload.sexo = sexoSelecionado === "Macho" ? "M" : "F";
    if (maturidadeSelecionada) payload.nivel_maturidade = mapMaturidade(maturidadeSelecionada) as any;
    if (statusSelecionado !== null)
      payload.status = statusSelecionado === "Ativo" ? true : statusSelecionado === "Inativo" ? false : undefined;
    if (racaSelecionada) payload.id_raca = getIdDaRaca(racaSelecionada);

    onFiltrar(payload);
  };

  // selecionada atual (para visual)
  const currentSelected = (() => {
    switch (categoriaAtiva) {
      case "Sexo":
        return sexoSelecionado;
      case "Raça":
        return racaSelecionada;
      case "Maturidade":
        return maturidadeSelecionada;
      case "Status":
        return statusSelecionado;
      default:
        return null;
    }
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtrar Rebanho</Text>
        <YellowButton title="Limpar" onPress={limparFiltros} />
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por brinco..."
          placeholderTextColor={colors.gray.base}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <Text style={styles.subtitle}>CATEGORIA DO FILTRO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollChips}>
        {categorias.map((cat) => {
          const ativo = cat === categoriaAtiva;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, ativo && styles.chipAtivo]}
              onPress={() => setCategoriaAtiva((prev) => (prev === cat ? null : cat))}
            >
              <Text style={[styles.chipText, ativo && styles.chipTextAtivo]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {categoriaAtiva && (
        <>
          <Text style={styles.subtitle}>OPÇÕES DE {categoriaAtiva.toUpperCase()}</Text>
          <View style={styles.optionsContainer}>
            {opcoesPorCategoria[categoriaAtiva]?.map((opcao) => {
              const selecionada = opcao === currentSelected;
              return (
                <TouchableOpacity
                  key={opcao}
                  style={[styles.optionButton, selecionada && styles.optionButtonActive]}
                  onPress={() => handleSelect(opcao)}
                >
                  <Text style={[styles.optionText, selecionada && styles.optionTextActive]}>{opcao}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <YellowButton title="Aplicar Filtro" onPress={aplicarFiltro} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 16, 
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
    shadowColor: colors.black.base,
    shadowOpacity: 0.05,
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowRadius: 4,
    elevation: 2, 
    zIndex: 1000
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black.base,
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray.base,
    fontWeight: "600",
    marginBottom: 8,
  },
  scrollChips: {
    flexGrow: 0,
    marginBottom: 16,
  },
  chip: {
    width: 120,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    marginRight: 8,
  },
  chipAtivo: {
    backgroundColor: colors.yellow.base,
  },
  chipText: {
    color: colors.black.base,
    fontWeight: "500",
    fontSize: 16,
  },
  chipTextAtivo: {
    color: colors.brown.base,
    fontWeight: "700",
  },
  searchWrapper: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray.disabled,
  },
  input: {
    fontSize: 16,
    color: colors.gray.base,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    flexGrow: 1,
    alignItems: "center",
    minWidth: "45%",
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: colors.yellow.base,
  },
  optionText: {
    color: colors.black.base,
    fontWeight: "500",
  },
  optionTextActive: {
    color: colors.brown.base,
    fontWeight: "700",
  },
});
