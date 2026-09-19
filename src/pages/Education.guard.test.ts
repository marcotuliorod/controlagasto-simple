import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Educação exibia o markdown dos artigos como texto cru (## e ** visíveis)
// porque `content` ia num <p whitespace-pre-wrap>. Trava a volta desse padrão.
describe("Education · artigo", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/Education.tsx"), "utf8");

  it("renderiza o conteúdo pelo <Markdown>", () => {
    expect(src).toMatch(/<Markdown[^>]*content=\{selectedContent\.content\}/);
  });

  it("não joga o conteúdo cru num whitespace-pre-wrap", () => {
    expect(src).not.toMatch(/whitespace-pre-wrap[^\n]*\{selectedContent\.content\}/);
  });
});
