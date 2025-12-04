import { supabase } from "../lib/supabase"

export async function criarFiscalizacao(
  obraId: string,
  observacao: string,
  fotoUrl: string
) {
  const { data, error } = await supabase
    .from("fiscalizacoes")
    .insert({
      obra_id: obraId,
      observacao,
      foto_url: fotoUrl
    })

  if (error) {
    console.error("Erro ao criar fiscalização:", error)
    return null
  }

  return data
}

export async function listarFiscalizacoes() {
  const { data, error } = await supabase
    .from("fiscalizacoes")
    .select("*")
    .order("criado_em", { ascending: false })

  if (error) {
    console.error("Erro ao listar fiscalizações:", error)
    return []
  }

  return data
}
