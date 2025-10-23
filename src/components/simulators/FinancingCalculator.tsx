import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateFinancing } from "@/lib/financialCalculations";
import { CreditCard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const FinancingCalculator = () => {
  const [amount, setAmount] = useState(30000);
  const [annualRate, setAnnualRate] = useState(12);
  const [months, setMonths] = useState(48);
  const [result, setResult] = useState<ReturnType<typeof calculateFinancing> | null>(null);

  const handleCalculate = () => {
    const calculation = calculateFinancing(amount, annualRate, months);
    setResult(calculation);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Calculadora de Financiamento
        </CardTitle>
        <CardDescription>
          Calcule as parcelas e o custo total do seu financiamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor Financiado (R$)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1000}
              step={1000}
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
            <Label htmlFor="months">Prazo (meses)</Label>
            <Input
              id="months"
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              min={6}
              max={360}
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full">
          Calcular Parcelas
        </Button>

        {result && (
          <div className="space-y-6 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Parcela Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {result.monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold">
                  R$ {result.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-red-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total de Juros</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  R$ {result.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Tabela de Amortização (Primeiras 12 parcelas)</h4>
              <ScrollArea className="h-64 w-full border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Mês</th>
                      <th className="p-2 text-right">Parcela</th>
                      <th className="p-2 text-right">Juros</th>
                      <th className="p-2 text-right">Amortização</th>
                      <th className="p-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.amortization.slice(0, 12).map((row) => (
                      <tr key={row.month} className="border-b">
                        <td className="p-2">{row.month}</td>
                        <td className="p-2 text-right font-medium">
                          R$ {row.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-red-600 dark:text-red-400">
                          R$ {row.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-green-600 dark:text-green-400">
                          R$ {row.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right">
                          R$ {row.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              {months > 12 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Mostrando primeiras 12 de {months} parcelas
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
