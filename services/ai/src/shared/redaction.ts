/**
 * Minimização de dados pessoais antes de enviar texto a um provedor externo.
 *
 * Motivação (LGPD): hoje o extrato bancário vai inteiro para o modelo —
 * titular, agência, conta, CPF, saldo e limite — quando o que se quer extrair
 * são apenas as transações. Redigir o que não é necessário reduz a superfície
 * sem perder o que a extração precisa.
 *
 * Cuidado deliberado: CNPJ NÃO é redigido por padrão. Ele identifica um
 * estabelecimento (pessoa jurídica), não o titular, e process-receipt o extrai
 * de propósito. Redigi-lo quebraria a funcionalidade sem ganho de privacidade.
 */

export type RedactionKind = "cpf" | "account" | "card" | "email" | "phone";

/** Cada padrão troca o dado por um marcador estável, para o modelo entender que há um campo ali. */
const PATTERNS: Record<RedactionKind, { regex: RegExp; placeholder: string }> = {
  // 000.000.000-00 ou 00000000000 (11 dígitos isolados)
  cpf: {
    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    placeholder: "[CPF]",
  },
  // Agência/conta: 1234 / 56789-0, ou "AG 1234 CC 56789"
  account: {
    regex: /\b(?:ag(?:ência|encia)?|c\/c|conta)\s*:?\s*\d{3,6}[-\s/]?\d{0,9}-?\d?\b/gi,
    placeholder: "[CONTA]",
  },
  // Cartão mascarado ou completo: 1234 5678 9012 3456, ****1234
  card: {
    regex: /\b(?:\d{4}[\s.-]?){3}\d{4}\b|\*{4,}[\s.-]?\d{4}\b/g,
    placeholder: "[CARTAO]",
  },
  email: {
    regex: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: "[EMAIL]",
  },
  // (11) 91234-5678 / +55 11 91234-5678
  phone: {
    regex: /(?:\+55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g,
    placeholder: "[TELEFONE]",
  },
};

export const DEFAULT_REDACTIONS: RedactionKind[] = ["cpf", "account", "card", "email", "phone"];

export interface RedactionReport {
  text: string;
  /** Quantas ocorrências de cada tipo foram removidas — vai para o log de auditoria LGPD. */
  removed: Partial<Record<RedactionKind, number>>;
}

/** Remove dados pessoais do texto, devolvendo também o que foi removido. */
export function redact(
  input: string,
  kinds: RedactionKind[] = DEFAULT_REDACTIONS,
): RedactionReport {
  const removed: Partial<Record<RedactionKind, number>> = {};
  let text = input;

  for (const kind of kinds) {
    const { regex, placeholder } = PATTERNS[kind];
    let count = 0;
    text = text.replace(new RegExp(regex.source, regex.flags), () => {
      count++;
      return placeholder;
    });
    if (count > 0) removed[kind] = count;
  }

  return { text, removed };
}

/**
 * Pseudonimiza o nome do titular. O chat-assistant hoje envia `profile.name`
 * real ao modelo; a saudação personalizada pode ser reconstruída localmente,
 * então o nome não precisa sair do servidor.
 */
export function pseudonymizeName(text: string, realName: string): string {
  const trimmed = realName.trim();
  if (trimmed.length < 3) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), "[USUARIO]");
}
