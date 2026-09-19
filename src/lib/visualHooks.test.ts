import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

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

  it("toda classe de paleta de status em src/ tem regra sob a chave", () => {
    // Enquanto os componentes usam text-green-500 & cia, o visual vidro remapeia
    // para tokens (bloco "Cores de status" em index.css). Classe nova sem regra
    // ficaria com a cor crua e sem contraste garantido sobre branco/preto.
    const files = execSync(
      "grep -rlE \"(text|bg|border)-(green|red|yellow|orange|blue|amber|emerald|purple)-[0-9]{2,3}\" src --include='*.tsx' --include='*.ts' --exclude='*.test.*' --exclude=toast.tsx || true",
      { cwd: root, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
    const re = /(?:dark:)?(?:text|bg|border)-(?:green|red|yellow|orange|blue|amber|emerald|purple)-\d{2,3}(?:\/\d+)?/g;
    const missing = new Set<string>();
    for (const f of files) {
      for (const cls of read(f).match(re) ?? []) {
        const esc = cls.replace(/:/g, "\\:").replace(/\//g, "\\/");
        if (!css.includes(`[data-visual="vidro"] .${esc} {`)) missing.add(cls);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("gráficos usam --chart-* e não hex fixo", () => {
    for (const f of ["src/pages/Reports.tsx", "src/pages/FinancialHealth.tsx"]) {
      expect(read(f)).not.toMatch(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/);
    }
    for (let n = 1; n <= 6; n++) {
      // valor de hoje em :root e a paleta A2-P sob a chave
      expect(css.match(new RegExp(`--chart-${n}:`, "g"))?.length).toBeGreaterThanOrEqual(3);
    }
  });
});
