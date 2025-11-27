import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { microcopy } from "@/lib/microcopy";
import { CategoryQuickPicker } from "@/components/CategoryQuickPicker";
import { useCategorySuggestion } from "@/hooks/useCategorySuggestion";
import { SuccessCheckmark } from "@/components/feedback/SuccessCheckmark";
import { Loader2, ChevronDown } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";

interface QuickAddExpenseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddExpense({ open, onOpenChange }: QuickAddExpenseProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { suggestions } = useCategorySuggestion(merchant);

  const handleQuickSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: parseFloat(amount),
        merchant: merchant || "Despesa rápida",
        category_id: categoryId || null,
        date: new Date().toISOString().split("T")[0],
        source: "quick_add",
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: microcopy.success.expenseAdded,
      });

      // Reset and close after showing success
      setTimeout(() => {
        setAmount("");
        setMerchant("");
        setCategoryId(undefined);
        setShowMoreFields(false);
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Erro",
        description: microcopy.errors.saveExpense,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFullForm = () => {
    onOpenChange(false);
    navigate("/add-expense");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Adicionar Despesa</DrawerTitle>
          <DrawerDescription>
            Adicione rapidamente ou acesse o formulário completo
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {success ? (
            <div className="py-8 flex justify-center">
              <SuccessCheckmark message={microcopy.success.expenseAdded} />
            </div>
          ) : (
            <>
              {/* Valor - Campo principal */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 text-lg h-12"
                    step="0.01"
                    autoFocus
                  />
                </div>
                {amount && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyBR(parseFloat(amount))}
                  </p>
                )}
              </div>

              {/* Merchant - Campo secundário */}
              <div className="space-y-2">
                <Label htmlFor="merchant">Local/Descrição</Label>
                <Input
                  id="merchant"
                  placeholder="Ex: Supermercado, Restaurante..."
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>

              {/* Category suggestions */}
              {suggestions.length > 0 && (
                <CategoryQuickPicker
                  suggestions={suggestions}
                  selected={categoryId}
                  onSelect={setCategoryId}
                />
              )}

              {/* More fields toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="w-full gap-2"
              >
                {showMoreFields ? "Menos campos" : "Mais campos"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showMoreFields ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {showMoreFields && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Para adicionar conta, método de pagamento, notas e outras
                    informações, use o formulário completo.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          {!success && (
            <div className="flex gap-2">
              <Button
                onClick={handleQuickSave}
                disabled={loading || !amount}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Rápido"
                )}
              </Button>
              <Button variant="outline" onClick={handleFullForm}>
                Formulário Completo
              </Button>
            </div>
          )}
          <DrawerClose asChild>
            <Button variant="ghost">
              {success ? "Fechar" : "Cancelar"}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
