import { supabase } from "../lib/supabase"

export async function uploadFoto(file: File) {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase
    .storage
    .from("fotos")
    .upload(fileName, file)

  if (error) {
    console.error("Erro ao enviar imagem:", error)
    return null
  }

  const { data } = supabase
    .storage
    .from("fotos")
    .getPublicUrl(fileName)

  return data.publicUrl
}
