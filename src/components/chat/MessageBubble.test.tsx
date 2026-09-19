import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MessageBubble from "./MessageBubble";

const TS = "2026-09-19T10:39:00.000Z";

describe("MessageBubble", () => {
  it("renderiza negrito do assistente como <strong>, sem asteriscos", () => {
    const { container } = render(
      <MessageBubble role="assistant" content="Seu **Score de Saúde** está em 0/100" timestamp={TS} />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("Score de Saúde");
    expect(container.textContent).not.toContain("**");
  });

  it("renderiza lista numerada do assistente como <ol>", () => {
    const { container } = render(
      <MessageBubble role="assistant" content={"1. Defina o valor\n2. Escolha o lugar"} timestamp={TS} />,
    );

    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
  });

  it("não executa HTML cru na resposta do assistente", () => {
    const { container } = render(
      <MessageBubble
        role="assistant"
        content={'<script>alert(1)</script> <img src="x" onerror="alert(2)">'}
        timestamp={TS}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("não deixa link javascript: virar href", () => {
    const { container } = render(
      <MessageBubble role="assistant" content="[clique](javascript:alert(1))" timestamp={TS} />,
    );

    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href.toLowerCase()).not.toContain("javascript:");
  });

  it("abre link http em nova aba com rel seguro", () => {
    const { container } = render(
      <MessageBubble role="assistant" content="[Tesouro](https://www.tesourodireto.com.br)" timestamp={TS} />,
    );

    const link = container.querySelector("a");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("mantém a mensagem do usuário como texto puro", () => {
    const { container } = render(
      <MessageBubble role="user" content="quanto é **10%** de 500?" timestamp={TS} />,
    );

    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toContain("**10%**");
  });

  it("renderiza título e itálico do assistente", () => {
    const { container } = render(
      <MessageBubble role="assistant" content={"## Resumo\n\nSeu gasto está *estável*"} timestamp={TS} />,
    );

    expect(container.querySelector("h2")?.textContent).toBe("Resumo");
    expect(container.querySelector("em")?.textContent).toBe("estável");
    expect(container.textContent).not.toMatch(/##|\*/);
  });
});
