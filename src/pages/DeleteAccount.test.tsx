import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DeleteAccount from "./DeleteAccount";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() }, auth: { signOut: vi.fn() } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Antes, uma falha da edge function aparecia como "Edge Function returned a
// non-2xx status code": o motivo em português fica no corpo da resposta.
describe("DeleteAccount · erro da edge function", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
    vi.mocked(supabase.functions.invoke).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  async function tryDelete() {
    render(
      <MemoryRouter>
        <DeleteAccount />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/Digite "EXCLUIR"/), "EXCLUIR");
    await userEvent.click(screen.getByRole("button", { name: /Excluir Conta Permanentemente/ }));
  }

  function invokeFails(status: number, body: string) {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      name: "FunctionsHttpError",
      context: new Response(body, { status }),
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error } as never);
  }

  it("mostra a mensagem que a função devolveu", async () => {
    invokeFails(401, JSON.stringify({ error: "Não autorizado" }));
    await tryDelete();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não autorizado"));
  });

  it("sem corpo aproveitável mostra o texto em português, nunca o do SDK", async () => {
    invokeFails(502, "<html>Bad Gateway</html>");
    await tryDelete();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erro ao excluir conta"));
  });
});
