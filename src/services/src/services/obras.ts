import { supabase } from "../lib/supabase"

export async function criarObra(nome: string, descricao: string) {
  const { data, error } = await supabase
    .from("obras")
    .insert({
      nome,
      descricao
    })

  if (error) {
    console.error("Erro ao criar obra:", error)
    return null
  }

  return data
}

export async function listarObras() {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .order("criado_em", { ascending: false })

  if (error) {
    console.error("Erro ao listar obras:", error)
    return []
  }

  return data
}
