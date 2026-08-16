import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FirstVisitTip } from "./FirstVisitTip";

const renderTip = () =>
  render(
    <TooltipProvider>
      <FirstVisitTip id="test-tip" message="Explicação da funcionalidade">
        <button>Alvo</button>
      </FirstVisitTip>
    </TooltipProvider>
  );

describe("FirstVisitTip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Radix renders tooltip content twice (visible + a visually-hidden copy
  // for screen readers), so assert on the count of matches rather than a
  // single element.

  it("shows the tip on first visit (no dismissal recorded)", async () => {
    renderTip();
    await waitFor(() => {
      expect(screen.getAllByText("Explicação da funcionalidade").length).toBeGreaterThan(0);
    });
  });

  it("does not show the tip once already dismissed", () => {
    localStorage.setItem("tip-seen-test-tip", "true");
    renderTip();
    expect(screen.queryAllByText("Explicação da funcionalidade")).toHaveLength(0);
  });

  it("dismisses and remembers when the confirm button is clicked", async () => {
    renderTip();
    await waitFor(() => {
      expect(screen.getAllByText("Explicação da funcionalidade").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Entendi" })[0]);

    await waitFor(() => {
      expect(screen.queryAllByText("Explicação da funcionalidade")).toHaveLength(0);
    });
    expect(localStorage.getItem("tip-seen-test-tip")).toBe("true");
  });
});
