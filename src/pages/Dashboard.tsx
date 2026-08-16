import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FirstVisitTip } from "@/components/FirstVisitTip";
import { toast } from "sonner";
import {
  Wallet,
  PieChart,
  Receipt,
  Target,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useCurrentMonthCategoryGoals } from "@/hooks/useCategoryGoals";
import { useBillingCycle } from "@/hooks/useBillingCycle";
import { InsightsCard } from "@/components/InsightsCard";
import { NotificationsCard } from "@/components/NotificationsCard";
import { FinancialHealthScore } from "@/components/FinancialHealthScore";
import { useExpensesRealtime } from "@/hooks/useExpensesRealtime";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { getContextualGreeting, getContextualMessage } from "@/lib/greeting";
import { AnimatedProgress } from "@/components/AnimatedProgress";
import { ContextualInsight } from "@/components/ContextualInsight";
import { useContextualInsight } from "@/hooks/useContextualInsight";

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
  payload: Record<string, unknown>;
  created_at: string;
  read: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { getCurrentCycle, hasCustomCycle } = useBillingCycle();
  const [userName, setUserName] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch category goals
  const { data: categoryGoals = [] } = useCurrentMonthCategoryGoals();

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current billing cycle - memoize to prevent recreating loadData
      const billingCycle = getCurrentCycle();
      const { start: cycleStart, end: cycleEnd, label: cycleLabel } = billingCycle;
      
      // 🚀 OTIMIZAÇÃO: Paralelizar queries independentes
      const [
        { data: profile },
        { data: goal },
        { data: allExpenses, error: expensesError },
        { data: notifs }
      ] = await Promise.all([
        // Query 1: Perfil
        supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single(),
        
        // Query 2: Meta mensal (usando label do ciclo)
        supabase
          .from("monthly_goals")
          .select("total_limit")
          .eq("user_id", user.id)
          .eq("month", cycleLabel)
          .maybeSingle(),
        
        // Query 3: Despesas do ciclo (usando date range)
        supabase
          .from("expenses")
          .select("id, amount, date, merchant, category_id, categories:categories!left(id, name, icon, color)")
          .eq("user_id", user.id)
          .gte("date", cycleStart)
          .lt("date", cycleEnd)
          .order("date", { ascending: false }),
        
        // Query 4: Notificações não lidas
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(3)
      ]);

      if (expensesError) {
        console.error("Erro ao buscar despesas:", expensesError);
        throw expensesError;
      }

      // Processar resultados
      if (profile) setUserName(profile.name);
      if (goal) setMonthlyGoal(Number(goal.total_limit || 0));

      // Calcular total do mês
      const totalSpent = (allExpenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      setTotalSpent(totalSpent);

      // Separar as 5 mais recentes para exibição
      const recentExpenses = (allExpenses || []).slice(0, 5);
      const formattedExpenses = recentExpenses.map((exp) => ({
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
      if (notifs) setNotifications(notifs);
    } catch (error: unknown) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove getCurrentCycle dependency to prevent memory leak

  // ✅ Hook centralizado para Realtime (evita WebSocket errors)
  useExpensesRealtime({
    channelName: 'dashboard-expenses',
    onUpdate: loadData,
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, [loadData]);

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
  
  // Calculate days left in cycle
  const daysLeft = useMemo(() => {
    const { end } = getCurrentCycle();
    const today = new Date();
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [getCurrentCycle]);

  // Get contextual insights
  const allExpensesForInsights = useMemo(() => 
    recentExpenses.map(e => ({
      amount: e.amount,
      category_id: undefined,
      date: e.date,
      merchant: e.merchant,
    })),
    [recentExpenses]
  );
  
  const insights = useContextualInsight(allExpensesForInsights, monthlyGoal);

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
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-card p-6 rounded-md border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-medium">{getContextualGreeting(userName)}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    {(() => {
                      const { start, end } = getCurrentCycle();
                      const startDate = new Date(start);
                      const endDate = new Date(end);
                      endDate.setDate(endDate.getDate() - 1);
                      return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
                    })()}
                  </p>
                  {hasCustomCycle && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      Ciclo Personalizado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <AnimatedProgress value={Math.min(progressPercent, 100)} size="md" />
          </div>
        </header>
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card key={notif.id} className="p-4 border-l-4 border-l-warning bg-warning/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Alerta de Meta - 80%</p>
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

        <FirstVisitTip
          id="dashboard-goal-card"
          message="Aqui você acompanha quanto já gastou em relação à sua meta mensal, com alertas quando estiver perto do limite."
        >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-medium">Meta do Mês</h2>
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
                {progressMessage.icon} {getContextualMessage(progressPercent, daysLeft)}
              </p>
              <Badge variant={progressPercent >= 100 ? "destructive" : "default"}>
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
        </FirstVisitTip>

        <FinancialHealthScore />

        {/* Contextual Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <ContextualInsight
                key={index}
                type={insight.type}
                title={insight.title}
                message={insight.message}
                action={insight.action}
                onAction={insight.action === "Adicionar despesa" ? () => navigate("/add-expense") : undefined}
              />
            ))}
          </div>
        )}

        <InsightsCard />

        <NotificationsCard />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryTotals.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-medium">Top Categorias</h2>
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

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-medium">Últimos Gastos</h2>
              </div>
            </div>

            {recentExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa ainda"
                description="Comece registrando sua primeira despesa para acompanhar seus gastos"
                actionLabel="Adicionar Despesa"
                onAction={() => navigate("/add-expense")}
              />
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
