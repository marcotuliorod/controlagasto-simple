import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { useAccounts, Account } from "@/hooks/useAccounts";
import { AccountCard } from "@/components/AccountCard";
import { AccountForm } from "@/components/AccountForm";
import { FirstVisitTip } from "@/components/FirstVisitTip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Accounts = () => {
  const { accountsWithBalance, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (accountData: Partial<Account>) => {
    if (accountData.id) {
      updateAccount.mutate(accountData as Partial<Account> & { id: string });
    } else {
      // AccountForm always populates every required Account field before
      // calling onSubmit; only `id` is legitimately absent (create path).
      createAccount.mutate(accountData as Omit<Account, "id" | "user_id" | "created_at" | "updated_at">);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteAccount.mutate(deletingId);
      setDeletingId(null);
    }
  };

  const filteredAccounts = accountsWithBalance?.filter((account) => {
    if (activeTab === "active") return account.is_active;
    if (activeTab === "inactive") return !account.is_active;
    return true;
  });

  const totalBalance = accountsWithBalance?.reduce(
    (sum, account) => sum + (account.is_active ? account.current_balance : 0),
    0
  ) || 0;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 pb-24 md:pb-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              Contas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas carteiras, contas e cartões
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        <FirstVisitTip
          id="accounts-balance-card"
          message="Cadastre carteiras, contas e cartões para organizar suas despesas por conta e acompanhar o saldo de cada uma."
        >
          <div className="bg-card rounded-lg p-6 border">
            <div className="text-sm text-muted-foreground">Saldo Total (contas ativas)</div>
            <div className={`text-3xl font-bold mt-1 ${totalBalance < 0 ? "text-destructive" : "text-primary"}`}>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalBalance)}
            </div>
          </div>
        </FirstVisitTip>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "active" | "inactive")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas ({accountsWithBalance?.length || 0})</TabsTrigger>
            <TabsTrigger value="active">
              Ativas ({accountsWithBalance?.filter((a) => a.is_active).length || 0})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativas ({accountsWithBalance?.filter((a) => !a.is_active).length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredAccounts && filteredAccounts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === "all"
                    ? "Nenhuma conta cadastrada. Crie sua primeira conta!"
                    : `Nenhuma conta ${activeTab === "active" ? "ativa" : "inativa"}`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AccountForm
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAccount(null);
          }}
          onSubmit={handleSubmit}
          account={editingAccount}
        />

        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conta? As despesas associadas não serão excluídas,
                mas perderão a referência à conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Accounts;
