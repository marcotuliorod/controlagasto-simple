import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  TrendingUp,
  LogOut,
  PieChart,
  Receipt,
  Target,
} from "lucide-react";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadData();
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, monthly_goal")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name);
        setMonthlyGoal(profile.monthly_goal);
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: expenses } = await supabase
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
        .gte("date", `${currentMonth}-01`)
        .order("date", { ascending: false })
        .limit(5);

      if (expenses) {
        const formattedExpenses = expenses.map((exp: any) => ({
          id: exp.id,
          amount: exp.amount,
          date: exp.date,
          merchant: exp.merchant || "Sem estabelecimento",
          category: {
            name: exp.categories?.name || "Outros",
            icon: exp.categories?.icon || "💰",
            color: exp.categories?.color || "#10b981",
          },
        }));
        setRecentExpenses(formattedExpenses);

        const total = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
        setTotalSpent(total);

        const catMap = new Map<string, CategoryTotal>();
        expenses.forEach((exp: any) => {
          const cat = exp.categories;
          const key = cat?.name || "Outros";
          if (catMap.has(key)) {
            catMap.get(key)!.total += parseFloat(exp.amount);
          } else {
            catMap.set(key, {
              name: cat?.name || "Outros",
              icon: cat?.icon || "💰",
              color: cat?.color || "#10b981",
              total: parseFloat(exp.amount),
            });
          }
        });

        const sorted = Array.from(catMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 3);
        setCategoryTotals(sorted);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const progressPercent = monthlyGoal > 0 ? (totalSpent / monthlyGoal) * 100 : 0;
  const remaining = monthlyGoal - totalSpent;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
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

      <main className="max-w-4xl mx-auto p-6 space-y-6">
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
            <Progress value={progressPercent} className="h-3" />
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
            <Button onClick={() => navigate("/add-expense")} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
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

        <Button onClick={() => navigate("/reports")} variant="outline" className="w-full" size="lg">
          <TrendingUp className="w-4 h-4 mr-2" />
          Ver Relatórios Completos
        </Button>
      </main>
    </div>
  );
};

export default Dashboard;
