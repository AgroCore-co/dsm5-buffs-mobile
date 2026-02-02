export const formatarDataBR = (data?: string | null) => {
  if (!data) return "-";

  // pega só a parte da data (antes do espaço)
  const [ano, mes, dia] = data.split(" ")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};
