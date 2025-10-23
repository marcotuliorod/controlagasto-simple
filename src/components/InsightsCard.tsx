import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useInsights, Insight } from "@/hooks/useInsights";
import { Skeleton } from "@/components/ui/skeleton";

const getInsightIcon = (type: Insight["type"]) => {
  switch (type) {
    case "positive":
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    case "warning":
      return <AlertCircle className="w-5 h-5 text-warning" />;
    case "tip":
      return <Lightbulb className="w-5 h-5 text-info" />;
  }
};

const getInsightVariant = (type: Insight["type"]) => {
  switch (type) {
    case "positive":
      return "default";
    case "warning":
      return "destructive";
    case "tip":
      return "secondary";
  }
};

export function InsightsCard() {
  const { data, isLoading, error } = useInsights();

  if (isLoading) {
    return (
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Insights Personalizados</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 shadow-card border-destructive/50">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-semibold">Insights Indisponíveis</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Não foi possível gerar insights no momento. Tente novamente mais tarde.
        </p>
      </Card>
    );
  }

  if (!data?.insights || data.insights.length === 0) {
    return (
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Insights Personalizados</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Adicione mais despesas para receber insights personalizados sobre seus gastos.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-semibold">Insights Personalizados</h2>
        <Badge variant="outline" className="ml-auto">
          IA
        </Badge>
      </div>
      <div className="space-y-4">
        {data.insights.map((insight, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
