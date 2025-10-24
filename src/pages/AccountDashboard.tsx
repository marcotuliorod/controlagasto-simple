import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AccountDashboard() {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["account-expenses", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, categories(name, icon)")
        .eq("account_id", accountId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["account-monthly", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("date, amount")
        .eq("account_id", accountId)
        .gte("date", format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"))
        .order("date");
      if (error) throw error;

      const monthlyMap = new Map<string, number>();
      data.forEach((exp) => {
        const month = format(new Date(exp.date), "MMM", { locale: ptBR });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(exp.amount));
      });

      return Array.from(monthlyMap.entries()).map(([month, total]) => ({
        month,
        total: Number(total.toFixed(2)),
      }));
    },
  });

  if (accountLoading || expensesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Conta não encontrada</CardTitle>
            <CardDescription>Esta conta não existe ou você não tem acesso a ela.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/accounts")} className="w-full">
              Voltar para Contas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const thisMonthExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate >= monthStart && expDate <= monthEnd;
  });

  const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const currentBalance = Number(account.initial_balance || 0) - totalExpenses;

  const categoryBreakdown = thisMonthExpenses.reduce((acc, exp) => {
    const catName = exp.categories?.name || "Sem Categoria";
    const catIcon = exp.categories?.icon || "❓";
    acc[catName] = (acc[catName] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryBreakdown)
    .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/accounts")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Contas
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{account.icon}</span>
            <div>
              <h1 className="text-3xl font-bold">{account.name}</h1>
              <p className="text-muted-foreground">
                {account.type === "checking" ? "Conta Corrente" : 
                 account.type === "savings" ? "Poupança" : 
                 account.type === "wallet" ? "Carteira" : "Outro"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyBR(currentBalance)}</div>
              <p className="text-xs text-muted-foreground">
                Saldo inicial: {formatCurrencyBR(account.initial_balance || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Este Mês</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrencyBR(thisMonthTotal)}</div>
              <p className="text-xs text-muted-foreground">
                {thisMonthExpenses.length} despesa{thisMonthExpenses.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyBR(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                {expenses.length} despesa{expenses.length !== 1 ? "s" : ""} no total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Mês</CardTitle>
              <CardDescription>Evolução dos gastos ao longo do ano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrencyBR(Number(value))} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorias Este Mês</CardTitle>
              <CardDescription>Distribuição por categoria em {format(currentMonth, "MMMM", { locale: ptBR })}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrencyBR(Number(value))} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Despesas Recentes</CardTitle>
            <CardDescription>Últimas despesas desta conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{expense.categories?.icon || "❓"}</span>
                    <div>
                      <p className="font-medium">{expense.merchant}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.date), "dd/MM/yyyy")} • {expense.categories?.name || "Sem Categoria"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">{formatCurrencyBR(expense.amount)}</p>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma despesa nesta conta</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
