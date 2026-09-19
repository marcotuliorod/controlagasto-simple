import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSendMessage } from "./useChatAssistant";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

// Print do usuário: o chat mostrava "Edge Function returned a non-2xx status
// code" porque o motivo real (429 do provedor de IA) ficava no corpo da resposta.
describe("useSendMessage · erro do chat", () => {
  beforeEach(() => {
    toast.mockReset();
    vi.mocked(supabase.functions.invoke).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function invokeFails(status: number, body: string) {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      name: "FunctionsHttpError",
      context: new Response(body, { status }),
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error } as never);
  }

  async function send() {
    const { result } = renderHook(() => useSendMessage(), { wrapper });
    result.current.mutate({ message: "como estou?" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    return result.current.error as Error;
  }

  it("mostra a mensagem em português que a função devolveu (429 da IA)", async () => {
    invokeFails(429, JSON.stringify({ error: "Muitas solicitações em sequência. Tente novamente em alguns segundos." }));

    const error = await send();
    expect(error.message).toBe("Muitas solicitações em sequência. Tente novamente em alguns segundos.");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Erro ao enviar mensagem", description: error.message, variant: "destructive" }),
    );
  });

  it("sem corpo aproveitável, cai numa mensagem em português (nunca a do SDK)", async () => {
    invokeFails(502, "<html>Bad Gateway</html>");

    const error = await send();
    expect(error.message).toMatch(/Não foi possível enviar a mensagem/);
    expect(error.message).not.toMatch(/non-2xx/);
  });
});
