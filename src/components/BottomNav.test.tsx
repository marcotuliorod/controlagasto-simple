import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";

describe("BottomNav", () => {
  it("mantém os 5 destinos, com nome acessível e rota (contrato dos E2E e da navegação)", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <BottomNav />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => [a.getAttribute("aria-label"), a.getAttribute("href")]);

    expect(links).toEqual([
      ["Início", "/dashboard"],
      ["Despesas", "/expenses"],
      ["Chat", "/chat"],
      ["Saúde", "/financial-health"],
      ["Perfil", "/account/profile"],
    ]);
  });

  it("marca a página atual e carrega os ganchos do visual vidro", () => {
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(nav.classList.contains("app-bottom-nav")).toBe(true);
    expect(nav.classList.contains("glass-strong")).toBe(true);
    // Sem a chave, o visual de hoje: colada embaixo, largura toda.
    expect(nav.classList.contains("bottom-0")).toBe(true);
  });
});
