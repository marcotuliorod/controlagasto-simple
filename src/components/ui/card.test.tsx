import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "./card";

describe("Card", () => {
  it("é sólido por padrão: dado financeiro não ganha vidro sem pedir", () => {
    const { container } = render(<Card>conteúdo</Card>);
    const el = container.firstElementChild as HTMLElement;

    expect(el.classList.contains("glass")).toBe(false);
    expect(el.classList.contains("bg-card")).toBe(true);
  });

  it("variant glass acrescenta .glass sem tirar a superfície sólida de fallback", () => {
    const { container } = render(<Card variant="glass">destaque</Card>);
    const el = container.firstElementChild as HTMLElement;

    expect(el.classList.contains("glass")).toBe(true);
    // bg-card + border continuam: fora de [data-visual="vidro"] o card é o de sempre.
    expect(el.classList.contains("bg-card")).toBe(true);
    expect(el.classList.contains("border")).toBe(true);
  });

  it("mantém rounded-md: os E2E de recorrentes e exports agendados localizam o card por essa classe", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstElementChild as HTMLElement;

    expect(el.matches("div.rounded-md")).toBe(true);
    // O raio maior do visual "vidro" vem de outra classe, não de trocar rounded-md.
    expect(el.classList.contains("card-surface")).toBe(true);
  });

  it("mantém className recebido e demais props", () => {
    const { getByTestId } = render(
      <Card data-testid="c" className="p-4" variant="glass">
        x
      </Card>,
    );
    const el = getByTestId("c");

    expect(el.classList.contains("p-4")).toBe(true);
    expect(el.classList.contains("glass")).toBe(true);
  });
});
