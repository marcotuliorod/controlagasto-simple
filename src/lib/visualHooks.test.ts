import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
 * Os componentes da casca carregam classes-gancho (app-shell, app-main…) que
 * só têm efeito sob [data-visual="vidro"]. Se alguém apagar a regra do CSS, a
 * classe vira lixo silencioso; se apagar a classe do componente, a regra vira
 * código morto. Este teste amarra os dois lados.
 */
const root = process.cwd();
const css = readFileSync(resolve(root, "src/index.css"), "utf8");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const hooks: Array<[string, string[]]> = [
  ["app-shell", ["src/components/AppLayout.tsx", "src/App.tsx"]],
  ["app-main", ["src/components/AppLayout.tsx"]],
  ["app-bottom-nav", ["src/components/BottomNav.tsx"]],
  ["command-root", ["src/components/ui/command.tsx"]],
];

describe("ganchos do visual vidro", () => {
  it.each(hooks)("%s tem regra no CSS e é usado nos componentes", (hook, files) => {
    expect(css).toContain(`[data-visual="vidro"] .${hook}`);
    for (const f of files) expect(read(f)).toContain(hook);
  });

  it("fora da chave nenhuma regra dos ganchos vaza (todas escopadas)", () => {
    for (const [hook] of hooks) {
      const bare = new RegExp(`(^|[^\\]"] )\\.${hook}\\s*\\{`, "m");
      expect(css).not.toMatch(bare);
    }
  });
});
