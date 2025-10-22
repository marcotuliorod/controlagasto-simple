import { supabase } from "@/integrations/supabase/client";

/**
 * Gera uma URL assinada temporária para acessar um arquivo privado no storage
 * @param path - Caminho do arquivo no bucket (ex: "user_id/filename.jpg")
 * @param expiresInSec - Tempo de expiração em segundos (padrão: 60s)
 * @returns URL assinada ou null em caso de erro
 */
export async function getSignedReceiptUrl(
  path: string,
  expiresInSec: number = 60
): Promise<string | null> {
  try {
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, expiresInSec);

    if (error) {
      console.error("Erro ao gerar URL assinada:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Erro ao gerar URL assinada:", error);
    return null;
  }
}
