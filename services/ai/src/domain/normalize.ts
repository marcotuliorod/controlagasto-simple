/**
 * Normalização determinística da saída do modelo.
 *
 * Isto NÃO é trabalho de IA: converter "R$ 1.234,56" em 1234.56 e "15/01/2024"
 * em "2024-01-15" é regra fechada. As edge functions antigas já faziam isso à
 * mão, espalhado e sem teste; aqui vira função pura e testável.
 */

/**
 * Converte valor monetário em número. Aceita o formato brasileiro
 * (ponto de milhar, vírgula decimal), o americano e número puro.
 * Devolve null quando não há valor reconhecível.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    // Vírgula é o separador decimal: "1.234,56"
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // Ponto é o separador decimal: "1,234.56"
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Normaliza data para ISO (YYYY-MM-DD). Aceita ISO, DD/MM/YYYY e DD-MM-YYYY
 * (formatos que aparecem em cupom e extrato brasileiro). Ano de 2 dígitos é
 * assumido como 20xx. Devolve null se a data não for válida.
 */
export function parseDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return isValidDate(iso[1]!, iso[2]!, iso[3]!) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;

  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(text);
  if (br) {
    const day = br[1]!.padStart(2, "0");
    const month = br[2]!.padStart(2, "0");
    const rawYear = br[3]!;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return isValidDate(year, month, day) ? `${year}-${month}-${day}` : null;
  }

  return null;
}

function isValidDate(year: string, month: string, day: string): boolean {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Rejeita 31/02 e afins: se o Date normalizar para outro mês, a data não existe.
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Texto vindo do modelo: string não-vazia ou null. Evita "null"/"N/A" virarem valor. */
export function parseText(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^(null|n\/a|não informado|nao informado|-)$/i.test(trimmed)) return null;
  return trimmed;
}
