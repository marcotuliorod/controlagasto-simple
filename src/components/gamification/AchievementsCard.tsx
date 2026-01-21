import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { useAchievements, useUserAchievements } from "@/hooks/useGamification";
import { AchievementBadge } from "./AchievementBadge";

export function AchievementsCard() {
  const { data: achievements, isLoading: loadingAchievements } = useAchievements();
  const { data: userAchievements, isLoading: loadingUserAchievements } = useUserAchievements();

  const isLoading = loadingAchievements || loadingUserAchievements;

  const earnedKeys = new Set(userAchievements?.map(ua => ua.achievement_key) || []);
  const earnedCount = earnedKeys.size;
  const totalCount = achievements?.length || 0;

  const getUserAchievementDate = (key: string) => {
    return userAchievements?.find(ua => ua.achievement_key === key)?.earned_at;
  };

  // Sort achievements: earned first, then by rarity
  const sortedAchievements = [...(achievements || [])].sort((a, b) => {
    const aEarned = earnedKeys.has(a.key);
    const bEarned = earnedKeys.has(b.key);
    
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return (rarityOrder[a.rarity as keyof typeof rarityOrder] || 3) - 
           (rarityOrder[b.rarity as keyof typeof rarityOrder] || 3);
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
          <Badge variant="outline">
            {earnedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conquista disponível ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <AchievementBadge
                  achievement={achievement}
                  earned={earnedKeys.has(achievement.key)}
                  earnedAt={getUserAchievementDate(achievement.key)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
