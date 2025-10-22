import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Calendar, TrendingDown, DollarSign } from "lucide-react";

interface MonthlyData {
  month: string;
  total: number;
  expenses: Array<{
    id: string;
    amount: number;
    date: string;
    merchant: string;
    category: {
      name: string;
      icon: string;
    };
  }>;
}

const Reports = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadMonthData(selectedMonth);
    }
  }, [selectedMonth]);

  const loadAvailableMonths = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("expenses")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (data) {
        const months = [...new Set(data.map((exp) => exp.date.slice(0, 7)))];
        setAvailableMonths(months);
        if (months.length > 0) {
          setSelectedMonth(months[0]);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar meses");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthData = async (month: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: expenses } = await supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          date,
          merchant,
          categories (name, icon)
        `
        )
        .eq("user_id", user.id)
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`)
        .order("date", { ascending: false });

      if (expenses) {
        const total = expenses.reduce(
          (sum: number, exp: any) => sum + parseFloat(exp.amount),
          0
        );

        setMonthlyData({
          month,
          total,
          expenses: expenses.map((exp: any) => ({
            id: exp.id,
            amount: parseFloat(exp.amount),
            date: exp.date,
            merchant: exp.merchant || "Sem estabelecimento",
            category: {
              name: exp.categories?.name || "Outros",
              icon: exp.categories?.icon || "💰",
            },
          })),
        });
      }
    } catch (error) {
      toast.error("Erro ao carregar dados do mês");
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { year: "numeric", month: "long" });
  };

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
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Relatórios</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <Label className="text-lg font-semibold">Selecione o Mês</Label>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um mês" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {monthlyData && (
          <>
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-success" />
                <h2 className="text-xl font-semibold">Total do Mês</h2>
              </div>
              <p className="text-4xl font-bold text-primary">
                R$ {monthlyData.total.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {monthlyData.expenses.length} despesas registradas
              </p>
            </Card>

            <Card className="p-6 shadow-card">
              <h2 className="text-xl font-semibold mb-4">Todas as Despesas</h2>
              {monthlyData.expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma despesa neste mês
                </p>
              ) : (
                <div className="space-y-3">
                  {monthlyData.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{expense.category.icon}</span>
                        <div>
                          <p className="font-medium">{expense.merchant}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString("pt-BR")} •{" "}
                            {expense.category.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-semibold">
                        R$ {expense.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
