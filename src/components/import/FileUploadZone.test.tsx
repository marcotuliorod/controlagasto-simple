import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUploadZone } from "./FileUploadZone";

// A zona de upload usa vidro só em repouso: com [data-visual="vidro"] o `.glass`
// sobrescreve borda e fundo, então arrastar/erro precisam ficar sem ele.
describe("FileUploadZone · vidro", () => {
  const zone = () => screen.getByRole("button");

  it("em repouso é vidro", () => {
    render(<FileUploadZone onFileSelect={() => {}} />);
    expect(zone().className).toContain("glass");
  });

  it("ao arrastar sobre a zona perde o vidro e ganha o destaque", () => {
    render(<FileUploadZone onFileSelect={() => {}} />);
    fireEvent.dragOver(zone());
    expect(zone().className).not.toContain("glass");
    expect(zone().className).toContain("border-primary");
  });
});
