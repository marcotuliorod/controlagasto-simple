/**
 * Assistente financeiro conversacional.
 *
 * Duas diferenças deliberadas em relação ao chat-assistant antigo:
 *
 * 1. O histórico da conversa é enviado. O original salvava as mensagens em
 *    `chat_messages` mas mandava só o turno atual ao modelo — então o
 *    assistente não lembrava do que acabara de dizer, e perguntas do tipo
 *    "e no mês passado?" ficavam sem referência.
 * 2. O nome real do usuário não é mais enviado (ver prompts/assistant.ts).
 *    Como reforço, `pseudonymizeName` limpa a pergunta caso o próprio usuário
 *    escreva o nome — defesa em profundidade, já que o prompt não o inclui.
 */
import type { LLMProvider, Message } from "../providers/types.ts";
import { AIError } from "../shared/errors.ts";
import { withRetry, withTimeout } from "../shared/resilience.ts";
import { pseudonymizeName } from "../shared/redaction.ts";
import { buildAssistantSystemPrompt, type AssistantContext } from "../prompts/assistant.ts";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  message: string;
}

export interface AskOptions {
  question: string;
  context: AssistantContext;
  /** Turnos anteriores, do mais antigo ao mais recente. */
  history?: ChatTurn[];
  /** Se informado, é removido da pergunta antes do envio. */
  userName?: string;
  signal?: AbortSignal;
}

export interface FinancialAssistant {
  ask(options: AskOptions): Promise<AssistantReply>;
}

const ASSISTANT_TIMEOUT_MS = 45_000;
const TEMPERATURE = 0.7;
/**
 * O prompt já pede 3-4 parágrafos; 1500 dá folga sem permitir resposta
 * quilométrica. O valor antigo era 800, herdado de um modelo sem raciocínio.
 */
const MAX_OUTPUT_TOKENS = 1_500;
const MAX_QUESTION_LENGTH = 4_000;
/** Turnos anteriores enviados. Limita custo e mantém o prompt previsível. */
const MAX_HISTORY_TURNS = 10;

export function createFinancialAssistant(provider: LLMProvider): FinancialAssistant {
  return {
    async ask({ question, context, history = [], userName, signal }): Promise<AssistantReply> {
      const trimmed = question.trim();
      if (!trimmed) throw new AIError("unsupported", "pergunta vazia");
      if (trimmed.length > MAX_QUESTION_LENGTH) {
        throw new AIError("unsupported", `pergunta acima de ${MAX_QUESTION_LENGTH} caracteres`);
      }

      const sanitize = (text: string) => (userName ? pseudonymizeName(text, userName) : text);

      const messages: Message[] = [
        ...history.slice(-MAX_HISTORY_TURNS).map(
          (turn): Message => ({
            role: turn.role,
            parts: [{ type: "text", text: sanitize(turn.content) }],
          }),
        ),
        { role: "user", parts: [{ type: "text", text: sanitize(trimmed) }] },
      ];

      const result = await withRetry(
        () =>
          withTimeout(
            ASSISTANT_TIMEOUT_MS,
            (timeoutSignal) =>
              provider.complete({
                system: buildAssistantSystemPrompt(context),
                messages,
                temperature: TEMPERATURE,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                // Conversa curta e didática não se beneficia de raciocínio
                // longo, e ele competiria pelo mesmo orçamento da resposta.
                reasoning: "disabled",
                signal: timeoutSignal,
              }),
            signal,
          ),
        { signal },
      );

      const message = result.text.trim();
      if (!message) throw new AIError("invalid_response", "resposta vazia do modelo");

      return { message };
    },
  };
}
