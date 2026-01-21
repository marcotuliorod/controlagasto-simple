import { cn } from "@/lib/utils";
import { Achievement } from "@/hooks/useGamification";

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
}

const rarityColors: Record<string, string> = {
  common: "bg-muted text-muted-foreground border-border",
  rare: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  epic: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  legendary: "bg-amber-500/10 text-amber-500 border-amber-500/30",
};

const rarityLabels: Record<string, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

export function AchievementBadge({ 
  achievement, 
  earned, 
  earnedAt,
  size = "md" 
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "p-2 text-lg",
    md: "p-3 text-2xl",
    lg: "p-4 text-4xl",
  };

  const containerClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  return (
    <div className={cn(
      "flex items-center",
      containerClasses[size],
      !earned && "opacity-50 grayscale"
    )}>
      <div className={cn(
        "rounded-xl border-2 flex items-center justify-center",
        sizeClasses[size],
        earned 
          ? rarityColors[achievement.rarity] 
          : "bg-muted/50 text-muted-foreground border-border/50"
      )}>
        <span>{achievement.icon || "🏆"}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium truncate",
            size === "sm" && "text-sm",
            size === "lg" && "text-lg"
          )}>
            {achievement.name}
          </p>
          {earned && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              rarityColors[achievement.rarity]
            )}>
              {rarityLabels[achievement.rarity]}
            </span>
          )}
        </div>
        <p className={cn(
          "text-muted-foreground truncate",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}>
          {achievement.description}
        </p>
        {earned && earnedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Conquistado em {new Date(earnedAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );
}
