import { Progress } from "@/components/ui/progress";
import { useUnlockStats } from "@/hooks/useGamification";
import { Trophy, Sparkles } from "lucide-react";

export function UnlockProgressIndicator() {
  const stats = useUnlockStats();

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Progresso</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {stats.unlocked}/{stats.total}
        </span>
      </div>
      
      <Progress value={stats.percentage} className="h-2" />
      
      {stats.percentage < 100 && (
        <p className="text-xs text-muted-foreground mt-2">
          Continue aprendendo para desbloquear mais!
        </p>
      )}
      
      {stats.allUnlocked && (
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Tudo desbloqueado!</span>
        </div>
      )}
    </div>
  );
}
