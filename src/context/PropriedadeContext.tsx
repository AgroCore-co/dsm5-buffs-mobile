import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "selectedPropriedadeId";

interface PropriedadeContextProps {
  propriedadeSelecionada: string | null;
  setPropriedadeSelecionada: (id: string | null) => void;
}

const PropriedadeContext = createContext<PropriedadeContextProps | undefined>(undefined);

export const PropriedadeProvider = ({ children }: { children: ReactNode }) => {
  const [propriedadeSelecionada, _setPropSelecionada] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(id => { if (id) _setPropSelecionada(id); })
      .catch(() => {});
  }, []);

  const setPropriedadeSelecionada = (id: string | null) => {
    _setPropSelecionada(id);
    if (id) {
      AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  };

  return (
    <PropriedadeContext.Provider value={{ propriedadeSelecionada, setPropriedadeSelecionada }}>
      {children}
    </PropriedadeContext.Provider>
  );
};

export const usePropriedade = () => {
  const context = useContext(PropriedadeContext);
  if (!context) {
    throw new Error("usePropriedade deve ser usado dentro de um PropriedadeProvider");
  }
  return context;
};
