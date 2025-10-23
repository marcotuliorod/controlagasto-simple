import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialHealthScore } from "@/components/FinancialHealthScore";
import { useScoreHistory } from "@/hooks/useFinancialHealthScore";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Calendar, Award, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const FinancialHealth = () => {
  const { data: history, isLoading } = useScoreHistory();

  const chartData = history?.map((score) => ({
    month: format(parseISO(`${score.month}-01`), "MMM/yy", { locale: ptBR }),
    score: score.score,
    budget: score.budget_adherence_score,
    quiz: score.quiz_performance_score,
    consistency: score.consistency_score,
    savings: score.savings_score,
  })).reverse() || [];

  const averageScore = history?.length 
    ? Math.round(history.reduce((sum, s) => sum + s.score, 0) / history.length)
    : 0;

  const bestScore = history?.length
    ? Math.max(...history.map(s => s.score))
    : 0;

  const trend = history && history.length >= 2
    ? history[0].score - history[1].score
    : 0;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Saúde Financeira
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe sua evolução financeira ao longo do tempo
          </p>
        </header>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Score Atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {history?.[0]?.score || 0}
                  <span className="text-sm text-muted-foreground ml-2">/100</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Média Histórica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {averageScore}
                  <span className="text-sm text-muted-foreground ml-2">/100</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Melhor Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {bestScore}
                  <span className="text-sm text-muted-foreground ml-2">/100</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Score */}
        <FinancialHealthScore />

        {/* Score History Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Score</CardTitle>
            <CardDescription>
              Histórico dos últimos 12 meses
              {trend !== 0 && (
                <span className={`ml-2 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trend > 0 ? '↗' : '↘'} {Math.abs(trend)} pontos
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    className="text-xs"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <p>Comece a usar o app para ver seu histórico de score</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Components Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Componentes do Score</CardTitle>
            <CardDescription>
              Evolução de cada componente ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 40]} className="text-xs" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Orçamento (40pts)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="quiz" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    name="Quiz (20pts)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="consistency" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Consistência (20pts)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="savings" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Economia (20pts)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <p>Dados insuficientes para gerar gráfico</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FinancialHealth;
