export const zootecToApiAdapter = (data: any) => {
  const payload = {
    peso: data.peso,
    condicao_corporal: data.condicaoCorporal,
    cor_pelagem: data.corPelagem,
    formato_chifre: data.formatoChifre,
    porte_corporal: data.porteCorporal,
    tipo_pesagem: data.tipoPesagem,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([_, value]) => value !== null && value !== undefined
    )
  );
};



export function sanitarioToApiAdapter(payload: any) {
  console.log("🔁 Adapter Sanitário → API");
  console.log("Entrada:", payload);

  const adapted = {
    ...(payload.doenca !== undefined && { doenca: payload.doenca }),
    ...(payload.dosagem !== undefined && { dosagem: payload.dosagem }),
    ...(payload.dtAplicacao !== undefined && { dt_aplicacao: payload.dtAplicacao }),
    ...(payload.idBufalo !== undefined && { id_bufalo: payload.idBufalo }),
    ...(payload.idMedicacao !== undefined && { id_medicao: payload.idMedicacao }),
    ...(payload.necessitaRetorno !== undefined && {
      necessita_retorno: payload.necessitaRetorno,
    }),
    ...(payload.unidadeMedida !== undefined && {
      unidade_medida: payload.unidadeMedida,
    }),
  };

  console.log("Saída:", adapted);

  return adapted;
}


