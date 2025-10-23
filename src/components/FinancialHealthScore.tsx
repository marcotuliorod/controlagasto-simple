import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFinancialHealthScore,
  useCalculateScore,
  getScoreLevel,
} from "@/hooks/useFinancialHealthScore";
import { format } from "date-fns";
import { RefreshCw, TrendingUp, Target, Brain, Calendar, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const FinancialHealthScore = () => {
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: score, isLoading } = useFinancialHealthScore(currentMonth);
  const calculateScore = useCalculateScore();
  const { toast } = useToast();

  // Auto-calculate score on first load if not exists
  useEffect(() => {
    if (!isLoading && !score) {
      calculateScore.mutate(currentMonth);
    }
  }, [isLoading, score, currentMonth]);

  const handleRefresh = async () => {
    try {
      await calculateScore.mutateAsync(currentMonth);
      toast({
        title: "Score atualizado!",
        description: "Seu score de saúde financeira foi recalculado.",
      });
    } catch (error) {
      console.error("Error calculating score:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o score.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !score) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const scoreInfo = getScoreLevel(score.score);

  const components = [
    {
      label: "Orçamento",
      value: score.budget_adherence_score,
      max: 40,
      icon: Target,
      color: "bg-blue-500",
    },
    {
      label: "Quiz",
      value: score.quiz_performance_score,
      max: 20,
      icon: Brain,
      color: "bg-purple-500",
    },
    {
      label: "Consistência",
      value: score.consistency_score,
      max: 20,
      icon: Calendar,
      color: "bg-green-500",
    },
    {
      label: "Economia",
      value: score.savings_score,
      max: 20,
      icon: Sparkles,
      color: "bg-yellow-500",
    },
  ];

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score de Saúde Financeira
            </CardTitle>
            <CardDescription className="mt-1">
              Seu desempenho financeiro este mês
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={calculateScore.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${calculateScore.isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Main Score Circle */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-8 border-border flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${
                    score.score * 3.6
                  }deg, transparent 0deg)`,
                }}
              />
              <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center z-10">
                <span className="text-4xl font-bold">{score.score}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${scoreInfo.color} flex items-center gap-2 justify-center`}>
              <span>{scoreInfo.emoji}</span>
              <span>{scoreInfo.level}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {scoreInfo.message}
            </p>
          </div>
        </div>

        {/* Score Components Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Componentes do Score</h4>
          {components.map((component) => {
            const Icon = component.icon;
            const percentage = (component.value / component.max) * 100;

            return (
              <div key={component.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{component.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {component.value}/{component.max}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Como melhorar seu score
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {score.budget_adherence_score < 30 && (
              <li>• Mantenha seus gastos dentro do orçamento mensal</li>
            )}
            {score.quiz_performance_score < 15 && (
              <li>• Complete mais questões do quiz educacional</li>
            )}
            {score.consistency_score < 15 && (
              <li>• Registre suas despesas com mais frequência</li>
            )}
            {score.savings_score < 15 && (
              <li>• Tente economizar mais dentro do seu orçamento</li>
            )}
            {score.score >= 75 && (
              <li>• Parabéns! Continue mantendo seus bons hábitos! 🎉</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
