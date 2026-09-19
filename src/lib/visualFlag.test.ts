import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
 * A chave do visual "vidro" vive num <script> inline do index.html (precisa
 * rodar antes do React para não piscar). Este teste extrai esse script e o
 * executa no jsdom, então cobre o código que realmente vai para o navegador.
 */
const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const match = html.match(/<script data-visual-flag>([\s\S]*?)<\/script>/);
if (!match) throw new Error("script data-visual-flag não encontrado em index.html");
const script = match[1];

function run(buildDefault?: string) {
  const code = buildDefault ? script.replace("%VITE_VISUAL_DEFAULT%", buildDefault) : script;
  new Function(code)();
}
const flag = () => document.documentElement.getAttribute("data-visual");

describe("chave do visual vidro (index.html)", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-visual");
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("fica desligada por padrão", () => {
    run();
    expect(flag()).toBeNull();
  });

  it("?visual=vidro liga e persiste para as próximas visitas", () => {
    window.history.pushState({}, "", "/?visual=vidro");
    run();
    expect(flag()).toBe("vidro");

    document.documentElement.removeAttribute("data-visual");
    window.history.pushState({}, "", "/dashboard");
    run();
    expect(flag()).toBe("vidro");
  });

  it("?visual=off desliga mesmo depois de ligada", () => {
    localStorage.setItem("visual", "vidro");
    window.history.pushState({}, "", "/?visual=off");
    run();

    expect(flag()).toBeNull();
    expect(localStorage.getItem("visual")).toBe("off");
  });

  it("ignora valor desconhecido na URL", () => {
    window.history.pushState({}, "", "/?visual=qualquer");
    run();

    expect(flag()).toBeNull();
    expect(localStorage.getItem("visual")).toBeNull();
  });

  it("o default do build liga quando é 'vidro', mas a escolha da pessoa vence", () => {
    run("vidro");
    expect(flag()).toBe("vidro");

    document.documentElement.removeAttribute("data-visual");
    localStorage.setItem("visual", "off");
    run("vidro");
    expect(flag()).toBeNull();
  });

  it("um default de build inesperado cai em desligado", () => {
    run("qualquer-coisa");
    expect(flag()).toBeNull();
  });

  it("não quebra quando localStorage está indisponível", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("bloqueado");
      },
    });
    try {
      expect(() => run()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
