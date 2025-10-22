import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Target, ArrowRight } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState("");

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const goal = parseFloat(monthlyGoal);
      if (isNaN(goal) || goal <= 0) {
        throw new Error("Meta inválida");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ monthly_goal: goal })
        .eq("id", user.id);

      if (error) throw error;

      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabase.from("monthly_goals").insert({
        user_id: user.id,
        month: currentMonth,
        total_limit: goal,
      });

      toast.success("Perfil configurado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar meta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
      <Card className="w-full max-w-md p-8 shadow-hover">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-center">Defina sua Meta</h1>
          <p className="text-muted-foreground text-center mt-2">
            Quanto você quer gastar por mês?
          </p>
        </div>

        <form onSubmit={handleComplete} className="space-y-6">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Começar"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
