import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ExpenseData {
  id: string;
  amount: number;
  date: string;
  merchant: string;
  category: {
    id: string;
    name: string;
    icon: string;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export default function Reports() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (selectedCategory) {
      setFilteredExpenses(expenses.filter(e => e.category.id === selectedCategory));
    } else {
      setFilteredExpenses(expenses);
    }
  }, [selectedCategory, expenses]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calcular intervalo inclusivo-exclusivo (mais robusto)
      const start = dateFrom || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
      const endDate = dateTo ? new Date(dateTo) : new Date();
      endDate.setDate(endDate.getDate() + 1); // próximo dia (exclusivo)
      const endExclusive = endDate.toISOString().slice(0, 10);

      console.log(`🔍 Relatórios: Buscando despesas de ${start} até ${endExclusive} (exclusivo)`);

      // LEFT JOIN para não perder despesas sem categoria, sem limites
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, date, merchant, payment_method, category_id, categories:categories!left(id, name, icon)")
        .eq("user_id", user.id)
        .gte("date", start)
        .lt("date", endExclusive)
        .order("date", { ascending: false });

      if (error) {
        console.error("❌ Erro ao buscar despesas:", error);
        throw error;
      }

      console.log(`✅ Relatórios: ${data?.length || 0} despesas encontradas`);

      const formattedData: ExpenseData[] = (data || []).map((exp: any) => ({
        id: exp.id,
        amount: Number(exp.amount || 0),
        date: exp.date,
        merchant: exp.merchant || "Sem estabelecimento",
        category: {
          id: exp.categories?.id || "",
          name: exp.categories?.name || "Outros",
          icon: exp.categories?.icon || "💰",
        },
      }));

      const total = formattedData.reduce((sum, e) => sum + e.amount, 0);
      console.log(`💰 Relatórios: Total calculado R$ ${total.toFixed(2)}`);

      setExpenses(formattedData);
      setFilteredExpenses(formattedData);
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const kpis = {
    total: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    count: filteredExpenses.length,
    average: filteredExpenses.length > 0
      ? filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / filteredExpenses.length
      : 0,
  };

  const categoryData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      const cat = exp.category.name;
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const getMonthlyComparison = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    const currentData = expenses.filter(e => e.date.startsWith(currentMonth));
    const lastData = expenses.filter(e => e.date.startsWith(lastMonthStr));

    return [
      {
        month: "Mês Anterior",
        total: lastData.reduce((sum, e) => sum + e.amount, 0),
      },
      {
        month: "Mês Atual",
        total: currentData.reduce((sum, e) => sum + e.amount, 0),
      },
    ];
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-data", {
        body: { period: { from: dateFrom, to: dateTo } },
      });

      if (error) throw error;

      const content = format === 'csv' ? data.csv : data.json;
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `despesas_${dateFrom}_${dateTo}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exportado com sucesso (${format.toUpperCase()})`);
    } catch (error: any) {
      toast.error("Erro ao exportar dados");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Relatórios Avançados</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-6">
            <p className="text-center">Carregando...</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Total no Período</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {kpis.total.toFixed(2)}
                </p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Ticket Médio</p>
                <p className="text-3xl font-bold text-secondary">
                  R$ {kpis.average.toFixed(2)}
                </p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Nº de Despesas</p>
                <p className="text-3xl font-bold">{kpis.count}</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Comparação Mensal</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getMonthlyComparison()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                    <Bar dataKey="total" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => {
                        const cat = filteredExpenses.find(
                          e => e.category.name === data.name
                        );
                        setSelectedCategory(
                          selectedCategory === cat?.category.id ? null : cat?.category.id || null
                        );
                      }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {selectedCategory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full mt-4"
                  >
                    Limpar Filtro
                  </Button>
                )}
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {selectedCategory ? "Despesas Filtradas" : "Todas as Despesas"}
              </h3>
              {filteredExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma despesa no período selecionado
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((expense) => (
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
                      <span className="text-lg font-semibold text-primary">
                        R$ {expense.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
