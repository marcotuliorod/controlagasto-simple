import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./Markdown";

// Texto real do artigo "Tipos de Investimentos para Iniciantes" (seed em
// supabase/migrations), que aparecia com ##, ### e ** crus em Educação.
const ARTIGO = `## Introdução aos Investimentos

Investir é uma das melhores formas de fazer seu dinheiro trabalhar para você.

### Renda Fixa

**Exemplos:**
- **Tesouro Direto**: Títulos públicos emitidos pelo governo federal
- **CDB**: Certificado de Depósito Bancário

### Por onde começar?

1. Monte sua reserva de emergência primeiro
2. Defina seus objetivos financeiros
3. Conheça seu perfil de investidor`;

describe("Markdown · artigo", () => {
  it("títulos viram heading, sem # no texto", () => {
    const { container } = render(<Markdown variant="article" content={ARTIGO} />);

    expect(screen.getByRole("heading", { level: 2, name: "Introdução aos Investimentos" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Renda Fixa" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Por onde começar?" })).toBeTruthy();
    expect(container.textContent).not.toContain("#");
  });

  it("negrito vira <strong>, sem asteriscos", () => {
    const { container } = render(<Markdown variant="article" content={ARTIGO} />);

    const bold = [...container.querySelectorAll("strong")].map((e) => e.textContent);
    expect(bold).toEqual(["Exemplos:", "Tesouro Direto", "CDB"]);
    expect(container.textContent).not.toContain("**");
  });

  it("lista com - vira <ul> e lista numerada vira <ol>", () => {
    const { container } = render(<Markdown variant="article" content={ARTIGO} />);

    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
  });

  it("código inline, itálico, citação e divisor", () => {
    const { container } = render(
      <Markdown content={"Use `CDB` e *renda fixa*\n\n> atenção\n\n---\n\n```\nlinha\n```"} />,
    );

    expect(container.querySelector("code")?.textContent).toBe("CDB");
    expect(container.querySelector("em")?.textContent).toBe("renda fixa");
    expect(container.querySelector("blockquote")?.textContent).toContain("atenção");
    expect(container.querySelector("hr")).toBeTruthy();
    expect(container.querySelector("pre code")?.textContent).toContain("linha");
  });
});

describe("Markdown · segurança", () => {
  it("não executa HTML cru", () => {
    const { container } = render(
      <Markdown content={'<script>alert(1)</script> <img src="x" onerror="alert(2)">'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("filtra javascript: em link e abre o resto em nova aba com noopener", () => {
    const { container } = render(
      <Markdown content="[ruim](javascript:alert(1)) e [bom](https://exemplo.com.br)" />,
    );

    const links = [...container.querySelectorAll("a")];
    expect(links.find((a) => a.textContent === "ruim")?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
    const bom = links.find((a) => a.textContent === "bom")!;
    expect(bom.getAttribute("target")).toBe("_blank");
    expect(bom.getAttribute("rel")).toContain("noopener");
  });
});

describe("Markdown · inline (insights)", () => {
  it("negrito continua negrito", () => {
    const { container } = render(<Markdown inline content="Você gastou **R$ 1.371** este mês" />);

    expect(container.querySelector("strong")?.textContent).toBe("R$ 1.371");
    expect(container.textContent).not.toContain("**");
  });

  it("título e lista viram texto, sem virar bloco", () => {
    const { container } = render(<Markdown inline content={"# Atenção\n\n- item"} />);

    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).toContain("Atenção");
  });

  it("não aninha <p> (o pai costuma ser um <p>)", () => {
    const { container } = render(
      <p>
        <Markdown inline content="texto simples" />
      </p>,
    );

    expect(container.querySelectorAll("p p")).toHaveLength(0);
  });
});
