import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
 * Guarda de contraste do visual "vidro". O Lighthouse não calcula contraste
 * sobre superfícies translúcidas, então lemos os tokens de src/index.css e
 * compomos o vidro sobre cada fundo possível (background, card, muted) na
 * mão. Pares de texto precisam de 4,5:1 (WCAG AA); o botão primário e o texto
 * do insight seguem a mesma régua.
 */
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloco ${selector} não encontrado em index.css`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

type RGB = [number, number, number];

function hsl(triple: string): RGB {
  const m = triple.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) throw new Error(`HSL inválido: ${triple}`);
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function rgba(value: string): { rgb: RGB; a: number } {
  const m = value.match(/^rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)$/);
  if (!m) throw new Error(`rgb() inválido: ${value}`);
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: Number(m[4]) };
}

const over = (top: RGB, a: number, bottom: RGB): RGB =>
  [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)) as RGB;

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes: Array<[string, Record<string, string>]> = [
  ["claro", block('[data-visual="vidro"]')],
  ["escuro", { ...block('[data-visual="vidro"]'), ...block('[data-visual="vidro"].dark') }],
];

describe.each(themes)("visual vidro · %s", (_nome, t) => {
  const bases = (["background", "card", "muted"] as const).map((k) => [k, hsl(t[k])] as const);
  const on = (surface: string, base: RGB): RGB => {
    const { rgb, a } = rgba(t[surface]);
    return over(rgb, a, base);
  };
  const min = (pairs: number[]) => Math.min(...pairs);

  it.each([
    ["texto", "foreground"],
    ["texto secundário", "muted-foreground"],
    ["link/primária", "primary"],
  ])("%s ≥ 4,5:1 sobre vidro e vidro forte", (_n, fg) => {
    const worst = min(
      bases.flatMap(([, base]) => [
        ratio(hsl(t[fg]), on("glass", base)),
        ratio(hsl(t[fg]), on("glass-strong", base)),
      ]),
    );
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });

  it("texto do insight (accent-foreground) ≥ 4,5:1 sobre vidro suave", () => {
    const worst = min(bases.map(([, base]) => ratio(hsl(t["accent-foreground"]), on("glass-soft", base))));
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });

  it("texto do botão primário ≥ 4,5:1", () => {
    expect(ratio(hsl(t["primary-foreground"]), hsl(t.primary))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["foreground", "muted-foreground", "primary", "success", "destructive", "warning"])(
    "%s ≥ 4,5:1 sobre a superfície sólida (bg-card)",
    (fg) => {
      expect(ratio(hsl(t[fg]), hsl(t.card))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("texto de botão destrutivo ≥ 4,5:1", () => {
    expect(ratio(hsl(t["destructive-foreground"]), hsl(t.destructive))).toBeGreaterThanOrEqual(4.5);
  });
});
