import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Search, DollarSign, Tag, CreditCard, Target } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import { Account } from "@/hooks/useAccounts";

interface SearchExpense {
  id: string;
  merchant: string | null;
  amount: number;
  categories: { name: string; icon: string } | null;
}

interface SearchCategory {
  id: string;
  name: string;
  icon: string;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<SearchExpense[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*, categories(name, icon)")
      .order("date", { ascending: false })
      .limit(20);

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    const { data: accountsData } = await supabase
      .from("accounts")
      .select("*")
      .order("name");

    setExpenses(expensesData || []);
    setCategories(categoriesData || []);
    setAccounts(accountsData || []);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar despesas, categorias, contas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        <CommandGroup heading="Despesas Recentes">
          {expenses.slice(0, 5).map((expense) => (
            <CommandItem
              key={expense.id}
              onSelect={() => {
                navigate(`/edit-expense/${expense.id}`);
                setOpen(false);
              }}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span className="flex-1">
                {expense.merchant} - {formatCurrencyBR(expense.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {expense.categories?.icon} {expense.categories?.name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Categorias">
          {categories.map((category) => (
            <CommandItem
              key={category.id}
              onSelect={() => {
                navigate(`/expenses?category=${category.id}`);
                setOpen(false);
              }}
            >
              <Tag className="mr-2 h-4 w-4" />
              <span>
                {category.icon} {category.name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Contas">
          {accounts.map((account) => (
            <CommandItem
              key={account.id}
              onSelect={() => {
                navigate(`/accounts/${account.id}`);
                setOpen(false);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>
                {account.icon} {account.name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => { navigate("/import-transactions"); setOpen(false); }}>
            <DollarSign className="mr-2 h-4 w-4" />
            Importar Extrato ou Fatura
          </CommandItem>
          <CommandItem onSelect={() => { navigate("/recurring-expenses"); setOpen(false); }}>
            <Target className="mr-2 h-4 w-4" />
            Despesas Recorrentes
          </CommandItem>
          <CommandItem onSelect={() => { navigate("/scheduled-exports"); setOpen(false); }}>
            <Search className="mr-2 h-4 w-4" />
            Exportações Agendadas
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
