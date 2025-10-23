import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateInvestmentProjection } from "@/lib/financialCalculations";
import { PiggyBank } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const InvestmentProjection = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(10);
  const [years, setYears] = useState(20);
  const [result, setResult] = useState<ReturnType<typeof calculateInvestmentProjection> | null>(null);

  const handleCalculate = () => {
    const calculation = calculateInvestmentProjection(
      monthlyInvestment,
      annualReturn,
      years
    );
    setResult(calculation);
  };

  const chartData = result?.annualBreakdown.map(item => ({
    ano: `Ano ${item.year}`,
    contribuicoes: item.contribution,
    rendimentos: item.returns,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Projeção de Investimentos
        </CardTitle>
        <CardDescription>
          Projete o crescimento dos seus investimentos no longo prazo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="investment">Investimento Mensal (R$)</Label>
            <Input
              id="investment"
              type="number"
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
              min={50}
              step={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="return">Retorno Anual (%)</Label>
            <Input
              id="return"
              type="number"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              min={0}
              max={50}
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
          Projetar
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
                <p className="text-sm text-muted-foreground">Rendimentos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  R$ {result.totalReturns.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Multiplicador do Investimento</p>
              <p className="text-3xl font-bold">
                {(result.finalAmount / result.totalContributions).toFixed(2)}x
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Seu dinheiro se multiplicará por este valor no período
              </p>
            </div>

            {chartData.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Evolução Anual</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="ano" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="contribuicoes" fill="hsl(var(--primary))" name="Contribuições" />
                    <Bar dataKey="rendimentos" fill="#10b981" name="Rendimentos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
