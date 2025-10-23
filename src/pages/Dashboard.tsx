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
  PieChart,
  Receipt,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useCurrentMonthCategoryGoals } from "@/hooks/useCategoryGoals";
import { InsightsCard } from "@/components/InsightsCard";

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

  // Fetch category goals
  const { data: categoryGoals = [] } = useCurrentMonthCategoryGoals();

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
          console.log('🔄 Dashboard: Despesa alterada, recarregando...', payload);
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

      // Calcular intervalo do mês atual (inclusivo no início, exclusivo no fim)
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const monthStart = `${currentMonth}-01`;
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonth = nextMonthDate.toISOString().slice(0, 10);

      console.log(`🔍 Dashboard: Buscando despesas de ${monthStart} até ${nextMonth} (exclusivo)`);
      
      const { data: goal } = await supabase
        .from("monthly_goals")
        .select("total_limit")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (goal) {
        setMonthlyGoal(Number(goal.total_limit || 0));
      }

      // Carregar TODAS as despesas do mês com LEFT JOIN (não perder despesas sem categoria)
      const { data: allExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, amount, date, merchant, category_id, categories:categories!left(id, name, icon, color)")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lt("date", nextMonth)
        .order("date", { ascending: false });
      
      if (expensesError) {
        console.error("❌ Erro ao buscar despesas:", expensesError);
        throw expensesError;
      }
      
      console.log(`✅ Dashboard: ${allExpenses?.length || 0} despesas encontradas no mês`);

      // Calcular total do mês (garantir conversão numérica robusta)
      const totalSpent = (allExpenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      console.log(`💰 Dashboard: Total calculado R$ ${totalSpent.toFixed(2)}`);
      setTotalSpent(totalSpent);

      // Separar as 5 mais recentes para exibição
      const recentExpenses = (allExpenses || []).slice(0, 5);
      const formattedExpenses = recentExpenses.map((exp: any) => ({
        id: exp.id,
        amount: Number(exp.amount || 0),
        date: exp.date,
        merchant: exp.merchant || "Sem estabelecimento",
        category: {
          name: exp.categories?.name || "Outros",
          icon: exp.categories?.icon || "💰",
          color: exp.categories?.color || "#10b981",
        },
      }));
      setRecentExpenses(formattedExpenses);

      // Agrupar por categoria (usando TODAS as despesas do mês, sem limites)
      const categoryMap = new Map<string, CategoryTotal>();
      
      (allExpenses || []).forEach(exp => {
        const cat = exp.categories || { name: "Outros", icon: "💰", color: "#10b981" };
        const key = cat.name;
        
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { 
            name: cat.name, 
            icon: cat.icon, 
            color: cat.color || "#10b981", 
            total: 0 
          });
        }
        
        const current = categoryMap.get(key)!;
        current.total += Number(exp.amount || 0);
      });

      const categoryData = Array.from(categoryMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      setCategoryTotals(categoryData);
      console.log(`📊 Dashboard: ${categoryData.length} categorias calculadas`);

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
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="gradient-primary text-white p-6 rounded-lg shadow-card">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Olá, {userName}</h1>
              <p className="text-white/80 text-sm">Acompanhe seus gastos</p>
            </div>
          </div>
        </header>
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

        <InsightsCard />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryTotals.length > 0 && (
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Top Categorias</h2>
              </div>
              <div className="space-y-3">
                {categoryTotals.map((cat) => {
                  const categoryGoal = categoryGoals.find(g => g.category?.name === cat.name);
                  const hasGoal = !!categoryGoal;
                  const percent = hasGoal ? (cat.total / categoryGoal.limit_amount) * 100 : 0;
                  
                  let statusColor = "bg-primary";
                  if (hasGoal) {
                    if (percent >= 100) statusColor = "bg-destructive";
                    else if (percent >= 80) statusColor = "bg-orange-500";
                    else if (percent >= 60) statusColor = "bg-yellow-500";
                  }

                  return (
                    <div key={cat.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-foreground">
                            R$ {cat.total.toFixed(2)}
                          </span>
                          {hasGoal && (
                            <p className="text-xs text-muted-foreground">
                              / R$ {categoryGoal.limit_amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      {hasGoal && (
                        <div className="space-y-1">
                          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${statusColor}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            {percent.toFixed(0)}% da meta
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      </div>
    </div>
  );
}
