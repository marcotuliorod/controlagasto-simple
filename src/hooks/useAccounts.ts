import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'wallet' | 'checking' | 'savings' | 'credit_card' | 'debit_card' | 'investment';
  last4?: string;
  initial_balance: number;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  current_balance: number;
}

export const useAccounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Account[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - accounts change rarely
    refetchOnWindowFocus: false,
  });

  const { data: accountsWithBalance } = useQuery({
    queryKey: ["accounts-with-balance"],
    queryFn: async () => {
      if (!accounts) return [];

      const accountsWithBalances: AccountWithBalance[] = await Promise.all(
        accounts.map(async (account) => {
          const { data: expenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("account_id", account.id);

          const totalSpent = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
          const currentBalance = Number(account.initial_balance) - totalSpent;

          return {
            ...account,
            current_balance: currentBalance,
          };
        })
      );

      return accountsWithBalances;
    },
    enabled: !!accounts,
    staleTime: 1000 * 60 * 2, // 2 minutes - balances change more often
  });

  const createAccount = useMutation({
    mutationFn: async (newAccount: Omit<Account, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          ...newAccount,
          user_id: session.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-with-balance"] });
      toast({
        title: "Conta criada",
        description: "Conta adicionada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-with-balance"] });
      toast({
        title: "Conta atualizada",
        description: "Alterações salvas com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-with-balance"] });
      toast({
        title: "Conta excluída",
        description: "Conta removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    accounts,
    accountsWithBalance,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};
