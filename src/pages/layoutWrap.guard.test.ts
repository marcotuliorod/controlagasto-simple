import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// O <AppLayout> é montado pelas rotas em App.tsx. Cinco páginas (Accounts,
// FinancialHealth, Simulator, Quiz, AuditLogs) se envolviam nele também, e a tela
// renderizava layout dentro de layout: cabeçalho e barra inferior duplicados no
// mobile, vão lateral no desktop. Página não deve importar o layout.
describe("páginas não montam o AppLayout", () => {
  const dir = resolve(process.cwd(), "src/pages");
  const pages = readdirSync(dir).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f));

  it.each(pages)("%s", (file) => {
    expect(readFileSync(resolve(dir, file), "utf8")).not.toMatch(/components\/AppLayout|<AppLayout/);
  });

  it("App.tsx é quem monta o layout das rotas autenticadas", () => {
    expect(readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8")).toContain("<AppLayout>");
  });
});
