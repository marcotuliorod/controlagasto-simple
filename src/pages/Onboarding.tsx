import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { Target, Calendar, Wallet, ArrowRight } from "lucide-react";
import { useAccounts, Account } from "@/hooks/useAccounts";
import { AccountFormFields } from "@/components/AccountForm";

const TOTAL_STEPS = 3;

const Onboarding = () => {
  const navigate = useNavigate();
  const { createAccount } = useAccounts();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleGoalNext = (e: React.FormEvent) => {
    e.preventDefault();
    const goal = parseFloat(monthlyGoal);
    if (isNaN(goal) || goal <= 0) {
      toast.error("Meta inválida");
      return;
    }
    setStep(2);
  };

  const handleCycleNext = () => setStep(3);

  const handleAccountSubmit = async (accountData: Partial<Account>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const goal = parseFloat(monthlyGoal);

      const { error } = await supabase
        .from("profiles")
        .update({
          monthly_goal: goal,
          billing_cycle_day: billingCycleDay,
        })
        .eq("id", user.id);

      if (error) throw error;

      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabase.from("monthly_goals").insert({
        user_id: user.id,
        month: currentMonth,
        total_limit: goal,
      });

      await createAccount.mutateAsync(
        accountData as Omit<Account, "id" | "user_id" | "created_at" | "updated_at">
      );

      toast.success("Perfil configurado com sucesso!");
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Erro ao concluir a configuração"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
      <Card className="w-full max-w-md p-8 shadow-hover">
        <Progress value={(step / TOTAL_STEPS) * 100} className="mb-6" />

        {step === 1 && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-center">Defina sua Meta</h1>
              <p className="text-muted-foreground text-center mt-2">
                Quanto você quer gastar por mês?
              </p>
            </div>

            <form onSubmit={handleGoalNext} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="goal">Meta Mensal (R$)</Label>
                <Input
                  id="goal"
                  type="number"
                  step="0.01"
                  placeholder="1500.00"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Você receberá alertas ao atingir 80% e 100% desta meta
                </p>
              </div>

              <Button type="submit" className="w-full">
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-center">Ciclo de Cobrança</h1>
              <p className="text-muted-foreground text-center mt-2">
                Quando você recebe seu salário?
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[1, 5, 10, 15].map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={billingCycleDay === day && !showCustomInput ? "default" : "outline"}
                    onClick={() => {
                      setBillingCycleDay(day);
                      setShowCustomInput(false);
                    }}
                  >
                    Dia {day}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                variant={showCustomInput ? "default" : "outline"}
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="w-full"
              >
                Outro dia (1-28)
              </Button>

              {showCustomInput && (
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={billingCycleDay}
                  onChange={(e) => setBillingCycleDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                  placeholder="Digite o dia (1-28)"
                />
              )}

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm">
                  ℹ️ Seus relatórios e metas seguirão este ciclo. Exemplo:
                  {billingCycleDay > 1 ? (
                    <>
                      <br/><strong>Dia {billingCycleDay}:</strong> Ciclo de {billingCycleDay}/Jan a {billingCycleDay > 1 ? billingCycleDay - 1 : 31}/Fev
                    </>
                  ) : (
                    <>
                      <br/><strong>Dia 1:</strong> Ciclo mensal padrão (01/Jan a 31/Jan)
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button type="button" className="flex-1" onClick={handleCycleNext}>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-center">Sua Primeira Conta</h1>
              <p className="text-muted-foreground text-center mt-2">
                Onde você guarda ou gasta seu dinheiro?
              </p>
            </div>

            <AccountFormFields
              onSubmit={handleAccountSubmit}
              onCancel={() => setStep(2)}
              cancelLabel="Voltar"
              submitLabel={isLoading ? "Salvando..." : "Concluir"}
              submitDisabled={isLoading}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default Onboarding;
