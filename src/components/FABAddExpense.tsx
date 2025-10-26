import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

export default function FABAddExpense() {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowQuickAdd(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <QuickAddModal 
        open={showQuickAdd} 
        onOpenChange={setShowQuickAdd}
        onSuccess={() => {
          // Optionally refresh data here if needed
        }}
      />

      <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {showMenu && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5">
            <Button
              onClick={() => {
                setShowQuickAdd(true);
                setShowMenu(false);
              }}
              className="h-12 px-4 rounded-full shadow-lg hover:shadow-hover transition-all"
              variant="secondary"
              title="Adição Rápida (Ctrl/Cmd + N)"
            >
              <Zap className="h-5 w-5 mr-2" />
              Rápido
            </Button>
            <Button
              onClick={() => {
                navigate("/add-expense");
                setShowMenu(false);
              }}
              className="h-12 px-4 rounded-full shadow-lg hover:shadow-hover transition-all"
              variant="secondary"
              title="Formulário Completo"
            >
              <Plus className="h-5 w-5 mr-2" />
              Completo
            </Button>
          </div>
        )}

        <Button
          onClick={() => setShowMenu(!showMenu)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-hover transition-all"
          size="icon"
          aria-label="Adicionar nova despesa"
          title="Adicionar despesa"
        >
          <Plus className={`h-6 w-6 transition-transform ${showMenu ? 'rotate-45' : ''}`} aria-hidden="true" />
          <span className="sr-only">Adicionar despesa</span>
        </Button>
      </div>
    </>
  );
}
