import React, { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import SearchIcon from "../../icons/search";
import { AnimalLac } from "../TableLactation";

interface SearchOnlyProps {
  animais: AnimalLac[];
  onFiltered: (animaisFiltrados: AnimalLac[]) => void;
}

export default function SimpleSearch({ animais, onFiltered }: SearchOnlyProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (search.trim() === "") {
      // 🔹 Sem busca → devolve todos
      onFiltered(animais);
    } else {
      // 🔹 Filtra apenas pelo brinco
      const filtered = animais.filter(a =>
        a.brinco.toLowerCase().includes(search.toLowerCase())
      );
      onFiltered(filtered);
    }
  }, [search]); // 👈 só depende do texto digitado

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TextTitle>Buscar animal por Brinco:</TextTitle>
      </View>

      {/* Barra de pesquisa */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Buscar..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.text.muted}
        />
        <TouchableOpacity
          style={styles.iconWrapper}
          onPress={() => console.log("Pesquisar", search)}
        >
          <SearchIcon fill={colors.black} size={18}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingBottom:16, 
  },

  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16 
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.subtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 12,
    overflow: "hidden",
  },

  input: {
    flex: 0.9,
    fontSize: 16,
    color: colors.text.muted,
  },

  iconWrapper: {
    width: '10%',
    height: '100%',
    alignItems:'center',
    justifyContent:'center',
    marginLeft: 'auto',
  },
});
