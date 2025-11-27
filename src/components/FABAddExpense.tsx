import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuickAddExpense } from "@/components/QuickAddExpense";

export default function FABAddExpense() {
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-hover z-50 transition-all"
        size="icon"
        aria-label="Adicionar nova despesa. Atalho: Ctrl ou Cmd + N"
        title="Adicionar despesa (Ctrl/Cmd + N)"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">Adicionar despesa</span>
      </Button>

      <QuickAddExpense open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
