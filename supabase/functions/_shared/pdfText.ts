/**
 * Extração local de texto de PDF.
 *
 * É o primeiro degrau da Fase 4: se o texto sai aqui, o extrato pode ser lido
 * por regra determinística e nada é enviado a fornecedor nenhum.
 *
 * Custo assumido: `unpdf` carrega o pdf.js, o que pesa no cold start da edge
 * function. Vale a troca — a alternativa é mandar o PDF inteiro (com titular,
 * conta e CPF) para o modelo em toda importação.
 *
 * Limite conhecido: PDF escaneado (imagem) não tem camada de texto. Nesse caso
 * a extração devolve pouco ou nada e o chamador precisa cair para a IA com
 * visão, que é o único caminho possível.
 */
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

export interface PdfTextResult {
  text: string;
  pages: number;
  /** false quando o PDF provavelmente é escaneado (sem camada de texto). */
  hasTextLayer: boolean;
}

/** Abaixo disto o PDF não tem texto aproveitável — trata como escaneado. */
const MIN_USEFUL_CHARS = 80;

function base64ToBytes(base64: string): Uint8Array {
  // Aceita data URL, que é como o app envia hoje.
  const clean = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function extractPdfText(pdfBase64: string): Promise<PdfTextResult> {
  const pdf = await getDocumentProxy(base64ToBytes(pdfBase64));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  const merged = Array.isArray(text) ? text.join("\n") : text;
  const normalized = (merged ?? "").replace(/\s+/g, " ").trim();

  return {
    text: normalized,
    pages: totalPages,
    hasTextLayer: normalized.length >= MIN_USEFUL_CHARS,
  };
}
