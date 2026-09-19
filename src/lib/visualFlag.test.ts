import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
 * O visual "vidro" é o padrão; a chave (?visual=off) é a saída de emergência.
 * Ela vive num <script> inline do index.html (precisa
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

  it("fica ligada por padrão", () => {
    run();
    expect(flag()).toBe("vidro");
  });

  it("?visual=off desliga e persiste para as próximas visitas", () => {
    window.history.pushState({}, "", "/?visual=off");
    run();
    expect(flag()).toBeNull();

    window.history.pushState({}, "", "/dashboard");
    run();
    expect(flag()).toBeNull();
    expect(localStorage.getItem("visual")).toBe("off");
  });

  it("?visual=vidro religa mesmo depois de desligada", () => {
    localStorage.setItem("visual", "off");
    window.history.pushState({}, "", "/?visual=vidro");
    run();

    expect(flag()).toBe("vidro");
    expect(localStorage.getItem("visual")).toBe("vidro");
  });

  it("ignora valor desconhecido na URL e no armazenamento", () => {
    window.history.pushState({}, "", "/?visual=qualquer");
    run();
    expect(flag()).toBe("vidro");
    expect(localStorage.getItem("visual")).toBeNull();

    document.documentElement.removeAttribute("data-visual");
    localStorage.setItem("visual", "lixo");
    run();
    expect(flag()).toBe("vidro");
  });

  it("o default do build 'off' desliga para todos, mas a escolha da pessoa vence", () => {
    run("off");
    expect(flag()).toBeNull();

    localStorage.setItem("visual", "vidro");
    run("off");
    expect(flag()).toBe("vidro");
  });

  it("um default de build inesperado cai no padrão (ligado)", () => {
    run("qualquer-coisa");
    expect(flag()).toBe("vidro");
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
      // sem armazenamento vale o padrão, e ?visual=off ainda funciona na sessão
      expect(flag()).toBe("vidro");

      document.documentElement.removeAttribute("data-visual");
      window.history.pushState({}, "", "/?visual=off");
      run();
      expect(flag()).toBeNull();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
