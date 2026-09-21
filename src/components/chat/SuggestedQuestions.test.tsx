import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuggestedQuestions from "./SuggestedQuestions";

describe("SuggestedQuestions", () => {
  it("cada pergunta é um botão que dispara o envio com o texto dela", async () => {
    const onQuestionClick = vi.fn();
    render(<SuggestedQuestions onQuestionClick={onQuestionClick} />);

    const button = screen.getByRole("button", { name: "O que é juros compostos?" });
    await userEvent.click(button);
    expect(onQuestionClick).toHaveBeenCalledWith("O que é juros compostos?");
  });

  // O Button base é whitespace-nowrap: "Dicas para economizar na categoria que mais
  // gasto" estourava a largura no mobile. jsdom não mede layout, então o teste
  // trava a classe que faz a quebra (a medição real está na PR, no navegador).
  it("permite quebra de linha nas perguntas longas", () => {
    render(<SuggestedQuestions onQuestionClick={() => {}} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("whitespace-normal");
      expect(button.className).not.toContain("whitespace-nowrap");
    }
  });
});
