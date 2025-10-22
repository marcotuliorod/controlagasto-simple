import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  TrendingUp,
  LogOut,
  PieChart,
  Receipt,
  Target,
  Bell,
  AlertTriangle,
  List,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";

interface Expense {
  id: string;
  amount: number;
  date: string;
  merchant: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

interface CategoryTotal {
  name: string;
  icon: string;
  color: string;
  total: number;
}

interface Notification {
  id: string;
  type: string;
  payload: any;
  created_at: string;
  read: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadData();

    // Subscrever a mudanças em tempo real na tabela expenses
    const channel = supabase
      .channel('dashboard-expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('Expense changed:', payload);
          // Recarregar dados quando houver mudança
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name);
      }

      // Carregar meta do mês corrente
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      
      // Calcular primeiro e último dia do mês corretamente
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dateFrom = firstDay.toISOString().split('T')[0];
      const dateTo = lastDay.toISOString().split('T')[0];
      
      console.log(`🔍 Dashboard: Buscando despesas de ${dateFrom} até ${dateTo}`);
      
      const { data: goal } = await supabase
        .from("monthly_goals")
        .select("total_limit")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (goal) {
        setMonthlyGoal(Number(goal.total_limit));
      }

      // Carregar TODAS as despesas do mês para cálculos corretos
      const { data: allExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          date,
          merchant,
          categories (name, icon, color)
        `
        )
        .eq("user_id", user.id)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });
      
      if (expensesError) {
        console.error("❌ Erro ao buscar despesas:", expensesError);
        throw expensesError;
      }
      
      console.log(`✅ Dashboard: ${allExpenses?.length || 0} despesas encontradas no mês`);

      // Carregar apenas as 5 mais recentes para exibição
      const { data: recentExpensesData } = await supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          date,
          merchant,
          categories (name, icon, color)
        `
        )
        .eq("user_id", user.id)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false })
        .limit(5);

      if (recentExpensesData) {
        const formattedExpenses = recentExpensesData.map((exp: any) => ({
          id: exp.id,
          amount: Number(exp.amount),
          date: exp.date,
          merchant: exp.merchant || "Sem estabelecimento",
          category: {
            name: exp.categories?.name || "Outros",
            icon: exp.categories?.icon || "💰",
            color: exp.categories?.color || "#10b981",
          },
        }));
        setRecentExpenses(formattedExpenses);
      }

      // Calcular total usando TODAS as despesas do mês
      if (allExpenses && allExpenses.length > 0) {
        const total = allExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
        setTotalSpent(total);
        console.log(`💰 Dashboard: Total calculado R$ ${total.toFixed(2)}`);

        // Calcular categorias usando TODAS as despesas
        const catMap = new Map<string, CategoryTotal>();
        allExpenses.forEach((exp: any) => {
          const cat = exp.categories;
          const key = cat?.name || "Outros";
          if (catMap.has(key)) {
            catMap.get(key)!.total += Number(exp.amount);
          } else {
            catMap.set(key, {
              name: cat?.name || "Outros",
              icon: cat?.icon || "💰",
              color: cat?.color || "#10b981",
              total: Number(exp.amount),
            });
          }
        });

        const sorted = Array.from(catMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 3);
        setCategoryTotals(sorted);
        console.log(`📊 Dashboard: ${sorted.length} categorias calculadas`);
      } else {
        setTotalSpent(0);
        setCategoryTotals([]);
        console.log("ℹ️ Dashboard: Nenhuma despesa encontrada no mês");
      }

      // Carregar notificações não lidas
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(3);

      if (notifs) {
        setNotifications(notifs);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const progressPercent = monthlyGoal > 0 ? (totalSpent / monthlyGoal) * 100 : 0;
  const remaining = monthlyGoal - totalSpent;

  const progressColor = useMemo(() => {
    if (progressPercent < 60) return "bg-primary";
    if (progressPercent < 80) return "bg-yellow-500";
    if (progressPercent < 100) return "bg-orange-500";
    return "bg-destructive";
  }, [progressPercent]);

  const progressMessage = useMemo(() => {
    if (progressPercent < 60) return { text: "Você está no caminho certo!", icon: "✅" };
    if (progressPercent < 80) return { text: "Atenção aos gastos", icon: "⚠️" };
    if (progressPercent < 100) return { text: "Cuidado! Próximo do limite", icon: "🚨" };
    return { text: "Meta ultrapassada!", icon: "❌" };
  }, [progressPercent]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex flex-col">
      <header className="gradient-primary text-white p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Olá, {userName}</h1>
              <p className="text-white/80 text-sm">Acompanhe seus gastos</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white hover:bg-white/20">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6 flex-1">
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card key={notif.id} className="p-4 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Alerta de Meta - 80%</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Você atingiu {notif.payload.percentage}% da sua meta mensal 
                        (R$ {Number(notif.payload.spent).toFixed(2)} de R$ {Number(notif.payload.limit).toFixed(2)})
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    Fechar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Meta do Mês</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gasto atual</span>
              <span className="font-semibold">
                R$ {totalSpent.toFixed(2)} / R$ {monthlyGoal.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <Progress value={Math.min(progressPercent, 100)} className="h-4" />
              <div
                className={`absolute top-0 left-0 h-4 rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {progressMessage.icon} {progressMessage.text}
              </p>
              <Badge variant={progressPercent >= 100 ? "destructive" : "secondary"}>
                {progressPercent.toFixed(0)}%
              </Badge>
            </div>
            {remaining >= 0 ? (
              <p className="text-sm text-success">
                Você ainda tem R$ {remaining.toFixed(2)} disponíveis
              </p>
            ) : (
              <p className="text-sm text-destructive">
                Você ultrapassou sua meta em R$ {Math.abs(remaining).toFixed(2)}
              </p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryTotals.length > 0 && (
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Top Categorias</h2>
              </div>
              <div className="space-y-3">
                {categoryTotals.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      R$ {cat.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-info" />
                <h2 className="text-xl font-semibold">Últimos Gastos</h2>
              </div>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum gasto registrado ainda</p>
                <Button onClick={() => navigate("/add-expense")} variant="link" className="mt-2">
                  Adicione seu primeiro gasto
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{expense.category.icon}</span>
                      <div>
                        <p className="font-medium">{expense.merchant}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-lg">
                      R$ {expense.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button onClick={() => navigate("/add-expense")} size="lg" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Despesa
          </Button>
          <Button onClick={() => navigate("/expenses")} variant="outline" size="lg" className="w-full">
            <List className="w-4 h-4 mr-2" />
            Ver Todas
          </Button>
          <Button onClick={() => navigate("/reports")} variant="outline" size="lg" className="w-full">
            <TrendingUp className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
