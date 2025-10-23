import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateCompoundInterest } from "@/lib/financialCalculations";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export const CompoundInterestCalculator = () => {
  const [initialAmount, setInitialAmount] = useState(1000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualRate, setAnnualRate] = useState(10);
  const [years, setYears] = useState(10);
  const [result, setResult] = useState<ReturnType<typeof calculateCompoundInterest> | null>(null);

  const handleCalculate = () => {
    const months = years * 12;
    const calculation = calculateCompoundInterest(
      initialAmount,
      monthlyContribution,
      annualRate,
      months
    );
    setResult(calculation);
  };

  const chartData = result?.monthlyBreakdown
    .filter((_, index) => index % 6 === 0 || index === result.monthlyBreakdown.length - 1)
    .map(item => ({
      month: `${Math.floor(item.month / 12)}a ${item.month % 12}m`,
      saldo: item.balance,
      contribuicoes: initialAmount + (item.month * monthlyContribution),
    })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Calculadora de Juros Compostos
        </CardTitle>
        <CardDescription>
          Simule o crescimento do seu investimento com aportes mensais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initial">Valor Inicial (R$)</Label>
            <Input
              id="initial"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              min={0}
              step={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly">Aporte Mensal (R$)</Label>
            <Input
              id="monthly"
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              min={0}
              step={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Taxa Anual (%)</Label>
            <Input
              id="rate"
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              min={0}
              max={100}
              step={0.5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">Período (anos)</Label>
            <Input
              id="years"
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              min={1}
              max={50}
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full">
          Calcular
        </Button>

        {result && (
          <div className="space-y-6 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor Final</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {result.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Investido</p>
                <p className="text-2xl font-bold">
                  R$ {result.totalContributions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-green-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Rendimento</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  R$ {result.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Evolução do Investimento</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorBalance)"
                    name="Saldo Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="contribuicoes" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total Investido"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
