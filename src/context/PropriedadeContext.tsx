import React, { createContext, useContext, useState, ReactNode } from "react";

interface PropriedadeContextProps {
  propriedadeSelecionada: string | null;
  setPropriedadeSelecionada: (id: string | null) => void;
}

const PropriedadeContext = createContext<PropriedadeContextProps | undefined>(undefined);

export const PropriedadeProvider = ({ children }: { children: ReactNode }) => {
  const [propriedadeSelecionada, setPropriedadeSelecionada] = useState<string | null>(null);
  
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
