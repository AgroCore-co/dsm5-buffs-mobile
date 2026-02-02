import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { colors } from "../../styles/colors";
import TextTitle from "../TextTitle";
import { usePropriedade } from "../../context/PropriedadeContext";

interface PropriedadesProps {
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  prop?: any[];
}

export default function Propriedades({ dropdownOpen, setDropdownOpen, prop }: PropriedadesProps) {
  const { propriedadeSelecionada, setPropriedadeSelecionada } = usePropriedade();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (prop && prop.length > 0) {
    const mapped = prop.map((p: any, index: number) => ({
      key: `${p.id}`,
      label: p.nome,
      value: p.id,
    }));
    console.log(mapped);
      setItems(mapped);

      if (!propriedadeSelecionada) {
        setPropriedadeSelecionada(mapped[0].value);
      }
    }
  }, [prop]);

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TextTitle>Propriedades</TextTitle>
      </View>

      {/* DropDown */}
      <View style={styles.dropdownWrapper}>
        <DropDownPicker
          open={open}
          value={propriedadeSelecionada} 
          items={items}
          setOpen={(o) => {
            setOpen(o);
            setDropdownOpen(typeof o === "boolean" ? o : false);
          }}
          setValue={(callback) => {
            const newValue = 
            typeof callback === "function"
            ? callback(propriedadeSelecionada)
            : callback; 
            setPropriedadeSelecionada(newValue as string | null);
              
          }}
          setItems={setItems}
          placeholder="Selecione uma propriedade"
          containerStyle={styles.dropdownContainer}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropDownContainer}
          listMode="SCROLLVIEW"
        />
      </View>
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
    marginBottom: 16 
  },

  title: { 
    fontSize: 18, 
    fontWeight: "bold" 
  },

  dropdownWrapper: {
    zIndex: 1000, // iOS
    elevation: 1000, // Android
  },

  dropdownContainer: { 
    height: 50,
  },

  dropdown: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    borderColor: "#ccc" 
  },

  dropDownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderColor: "#ccc",
    zIndex: 1000, // iOS
    elevation: 1000, // Android
  },
});
