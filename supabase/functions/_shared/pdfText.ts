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
 *
 * ## Por que não usar o `extractText` do unpdf
 *
 * Ele devolve a página inteira numa string sem uma única quebra de linha.
 * Medido contra um extrato real: 7 lançamentos viraram um parágrafo corrido,
 * e o parser — que ancora na data — passou a emendar o valor de uma transação
 * na descrição da seguinte, devolvendo 2 transações inventadas em vez de 5.
 *
 * O PDF preserva a informação: cada item de texto traz sua posição em
 * `transform` ([4] = x, [5] = y). Agrupar por y reconstrói as linhas. É mais
 * código que chamar `extractText`, e é o que faz a diferença entre um extrato
 * lido e um extrato inventado.
 */
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

export interface PdfTextResult {
  /** Texto com as quebras de linha do documento preservadas. */
  text: string;
  pages: number;
  /** false quando o PDF provavelmente é escaneado (sem camada de texto). */
  hasTextLayer: boolean;
}

/** Abaixo disto o PDF não tem texto aproveitável — trata como escaneado. */
const MIN_USEFUL_CHARS = 80;

/**
 * Itens dentro desta distância vertical (em pontos) são a mesma linha.
 * Sobrescritos e fontes de tamanhos diferentes na mesma linha variam um pouco;
 * 2pt absorve isso sem juntar linhas vizinhas, que num extrato ficam a ~12pt.
 */
const LINE_TOLERANCE_PT = 2;

/**
 * Lacuna horizontal, em pontos, a partir da qual se assume um espaço entre dois
 * itens vizinhos. Nem todo PDF emite o espaço como item próprio.
 */
const SPACE_GAP_PT = 1;

interface TextItem {
  str?: string;
  width?: number;
  transform?: number[];
}

interface PositionedItem {
  x: number;
  width: number;
  str: string;
}

/**
 * Reconstrói as linhas de uma página a partir da posição de cada item.
 *
 * Agrupa por y em vez de confiar na ordem dos itens: o PDF não garante ordem de
 * leitura, e um extrato com colunas pode emitir a coluna de valores só no fim.
 */
function itemsToLines(items: TextItem[]): string[] {
  const rows: { y: number; items: PositionedItem[] }[] = [];

  for (const item of items) {
    const str = item.str;
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    if (!str || typeof x !== "number" || typeof y !== "number") continue;

    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= LINE_TOLERANCE_PT);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, width: item.width ?? 0, str });
  }

  // No PDF o y cresce de baixo para cima; a ordem de leitura é a inversa.
  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) => {
      const sorted = row.items.sort((a, b) => a.x - b.x);
      let line = "";
      let cursor: number | null = null;

      for (const item of sorted) {
        // Só insere espaço quando o PDF não emitiu um: emendar palavras
        // corrompe a descrição, e espaço a mais é inofensivo (normalizado abaixo).
        if (cursor !== null && item.x - cursor > SPACE_GAP_PT && !line.endsWith(" ")) {
          line += " ";
        }
        line += item.str;
        cursor = item.x + item.width;
      }

      return line.replace(/[^\S\n]+/g, " ").trim();
    })
    .filter(Boolean);
}

export async function extractPdfText(pdfBase64: string): Promise<PdfTextResult> {
  const pdf = await getDocumentProxy(base64ToBytes(pdfBase64));
  const totalPages: number = pdf.numPages;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(...itemsToLines(content.items as TextItem[]));
  }

  const text = lines.join("\n");

  return {
    text,
    pages: totalPages,
    // Conta sem as quebras: um PDF com muitas linhas vazias não é texto útil.
    hasTextLayer: text.replace(/\s/g, "").length >= MIN_USEFUL_CHARS,
  };
}

function base64ToBytes(base64: string): Uint8Array {
  // Aceita data URL, que é como o app envia hoje.
  const clean = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
