import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerCelebration } from "@/components/feedback/Celebration";

// Types for gamification system
export interface UnlockRequirement {
  id: string;
  menu_item_key: string;
  unlock_level: number;
  required_educational_category: string | null;
  required_educational_count: number | null;
  required_quiz_category: string | null;
  required_quiz_score: number | null;
  required_days_active: number | null;
  required_expense_count: number | null;
  unlock_message: string | null;
  unlock_celebration: string | null;
}

export interface UserUnlock {
  id: string;
  user_id: string;
  menu_item_key: string;
  unlocked_at: string;
  unlock_method: string | null;
  unlock_details: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  unlock_condition: Record<string, unknown>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
}

// The DB columns above are nullable at the schema level even though the app
// always writes them (unlocked_at/earned_at default to now(), rarity
// defaults to 'common'); default them here so the rest of the app can rely
// on the non-null public interfaces above instead of re-checking for null.
function toUserUnlock(row: {
  id: string;
  user_id: string;
  menu_item_key: string;
  unlocked_at: string | null;
  unlock_method: string | null;
  unlock_details: unknown;
}): UserUnlock {
  return {
    ...row,
    unlocked_at: row.unlocked_at ?? new Date().toISOString(),
    unlock_details: (row.unlock_details as Record<string, unknown> | null) ?? {},
  };
}

function toAchievement(row: {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string | null;
  unlock_condition: unknown;
}): Achievement {
  return {
    ...row,
    rarity: row.rarity ?? "common",
    unlock_condition: (row.unlock_condition as Record<string, unknown> | null) ?? {},
  };
}

function toUserAchievement(row: {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string | null;
}): UserAchievement {
  return {
    ...row,
    earned_at: row.earned_at ?? new Date().toISOString(),
  };
}

export interface UnlockProgress {
  educationCompleted: number;
  educationRequired: number;
  quizBestScore: number | null;
  quizRequiredScore: number | null;
  daysActive: number;
  daysRequired: number | null;
  expenseCount: number;
  expenseRequired: number | null;
}

// Menu items that are always unlocked (Level 1)
const ALWAYS_UNLOCKED = [
  "dashboard",
  "add-expense",
  "expenses",
  "education",
  "quiz",
  "settings",
  "account/profile",
  "notification-settings",
];

/**
 * Fetch all unlock requirements
 */
export function useUnlockRequirements() {
  return useQuery({
    queryKey: ["unlock-requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unlock_requirements")
        .select("*")
        .order("unlock_level", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch user's unlocked items
 */
export function useUserUnlocks() {
  return useQuery({
    queryKey: ["user-unlocks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_unlocks")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map(toUserUnlock);
    },
  });
}

/**
 * Check if gamification is enabled for user
 */
export function useGamificationEnabled() {
  return useQuery({
    queryKey: ["gamification-enabled"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { enabled: false, bypass: false };

      const { data, error } = await supabase
        .from("profiles")
        .select("gamification_enabled, bypass_unlock_requirements, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (error) return { enabled: true, bypass: false, onboardingCompleted: false };
      
      return {
        enabled: data.gamification_enabled ?? true,
        bypass: data.bypass_unlock_requirements ?? false,
        onboardingCompleted: data.onboarding_completed ?? false,
      };
    },
  });
}

/**
 * Calculate unlock progress for a specific menu item
 */
export function useUnlockProgress() {
  return useQuery({
    queryKey: ["unlock-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // These 6 reads are all independent (scoped only by user.id or static
      // content tables) — fetch them concurrently instead of one at a time.
      const [
        { data: educationProgress },
        { data: educationalContent },
        { data: quizResponses },
        { data: quizQuestions },
        { count: expenseCount },
        { data: expenseDates },
      ] = await Promise.all([
        // Education progress
        supabase
          .from("user_content_progress")
          .select("content_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true),
        // Educational content, to map categories
        supabase
          .from("educational_content")
          .select("id, category"),
        // Quiz responses
        supabase
          .from("quiz_responses")
          .select("question_id, is_correct"),
        // Quiz questions, for categories
        supabase
          .from("quiz_questions")
          .select("id, category"),
        // Expense count
        supabase
          .from("expenses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        // Days active (unique dates with expenses in last 30 days)
        supabase
          .from("expenses")
          .select("date")
          .eq("user_id", user.id)
          .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      ]);

      const uniqueDays = new Set(expenseDates?.map(e => e.date) || []).size;

      // Build category education counts
      const educationByCategory: Record<string, number> = {};
      const contentMap = new Map(educationalContent?.map(c => [c.id, c.category]) || []);
      
      educationProgress?.forEach(p => {
        const category = contentMap.get(p.content_id);
        if (category) {
          educationByCategory[category] = (educationByCategory[category] || 0) + 1;
        }
      });

      // Build quiz scores by category
      const quizScoresByCategory: Record<string, { correct: number; total: number }> = {};
      const questionMap = new Map(quizQuestions?.map(q => [q.id, q.category]) || []);

      quizResponses?.forEach(r => {
        const category = questionMap.get(r.question_id);
        if (category) {
          if (!quizScoresByCategory[category]) {
            quizScoresByCategory[category] = { correct: 0, total: 0 };
          }
          quizScoresByCategory[category].total++;
          if (r.is_correct) {
            quizScoresByCategory[category].correct++;
          }
        }
      });

      return {
        educationByCategory,
        quizScoresByCategory,
        totalEducationCompleted: educationProgress?.length || 0,
        totalQuizResponses: quizResponses?.length || 0,
        expenseCount: expenseCount || 0,
        daysActive: uniqueDays,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Check if a specific menu item is unlocked
 */
export function useMenuItemUnlockStatus(menuItemKey: string) {
  const { data: requirements } = useUnlockRequirements();
  const { data: userUnlocks } = useUserUnlocks();
  const { data: gamificationSettings } = useGamificationEnabled();
  const { data: progress } = useUnlockProgress();

  // Always unlocked items
  if (ALWAYS_UNLOCKED.includes(menuItemKey)) {
    return { isUnlocked: true, requirement: null, progress: null };
  }

  // Gamification disabled or bypass enabled
  if (!gamificationSettings?.enabled || gamificationSettings?.bypass) {
    return { isUnlocked: true, requirement: null, progress: null };
  }

  // Check if already unlocked by user
  const alreadyUnlocked = userUnlocks?.some(u => u.menu_item_key === menuItemKey);
  if (alreadyUnlocked) {
    return { isUnlocked: true, requirement: null, progress: null };
  }

  // Find requirement for this menu item
  const requirement = requirements?.find(r => r.menu_item_key === menuItemKey);
  if (!requirement) {
    return { isUnlocked: true, requirement: null, progress: null };
  }

  // Check if requirements are met
  let isUnlocked = false;

  if (progress) {
    // Check educational requirement
    if (requirement.required_educational_category && requirement.required_educational_count) {
      const completed = progress.educationByCategory[requirement.required_educational_category] || 0;
      if (completed >= requirement.required_educational_count) {
        isUnlocked = true;
      }
    }

    // Check quiz requirement
    if (!isUnlocked && requirement.required_quiz_category && requirement.required_quiz_score) {
      const quizData = progress.quizScoresByCategory[requirement.required_quiz_category];
      if (quizData && quizData.total > 0) {
        const score = Math.round((quizData.correct / quizData.total) * 100);
        if (score >= requirement.required_quiz_score) {
          isUnlocked = true;
        }
      }
    }

    // Check expense count requirement
    if (!isUnlocked && requirement.required_expense_count) {
      if (progress.expenseCount >= requirement.required_expense_count) {
        isUnlocked = true;
      }
    }

    // Check days active requirement
    if (!isUnlocked && requirement.required_days_active) {
      if (progress.daysActive >= requirement.required_days_active) {
        isUnlocked = true;
      }
    }
  }

  // Build progress info for UI
  const progressInfo: UnlockProgress = {
    educationCompleted: requirement.required_educational_category 
      ? (progress?.educationByCategory[requirement.required_educational_category] || 0)
      : 0,
    educationRequired: requirement.required_educational_count || 0,
    quizBestScore: requirement.required_quiz_category && progress?.quizScoresByCategory[requirement.required_quiz_category]
      ? Math.round((progress.quizScoresByCategory[requirement.required_quiz_category].correct / 
          progress.quizScoresByCategory[requirement.required_quiz_category].total) * 100)
      : null,
    quizRequiredScore: requirement.required_quiz_score,
    daysActive: progress?.daysActive || 0,
    daysRequired: requirement.required_days_active,
    expenseCount: progress?.expenseCount || 0,
    expenseRequired: requirement.required_expense_count,
  };

  return { isUnlocked, requirement, progress: progressInfo };
}

/**
 * Unlock a menu item
 */
export function useUnlockMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      menuItemKey, 
      method, 
      details 
    }: { 
      menuItemKey: string; 
      method: string; 
      details?: Record<string, unknown> 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_unlocks")
        .insert([{
          user_id: user.id,
          menu_item_key: menuItemKey,
          unlock_method: method,
          unlock_details: details || {},
        }]);

      if (error && !error.message.includes("duplicate")) throw error;
      return { menuItemKey };
    },
    onSuccess: ({ menuItemKey }) => {
      queryClient.invalidateQueries({ queryKey: ["user-unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      
      triggerCelebration("achievement");
      toast.success("🎉 Funcionalidade Desbloqueada!", {
        description: `Você agora pode acessar: ${menuItemKey.replace(/-/g, " ")}`,
      });
    },
  });
}

/**
 * Fetch all achievements
 */
export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("rarity", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(toAchievement);
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Fetch user's earned achievements
 */
export function useUserAchievements() {
  return useQuery({
    queryKey: ["user-achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(toUserAchievement);
    },
  });
}

/**
 * Award an achievement to user
 */
export function useAwardAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementKey: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_achievements")
        .insert([{
          user_id: user.id,
          achievement_key: achievementKey,
        }]);

      if (error && !error.message.includes("duplicate")) throw error;
      return { achievementKey };
    },
    onSuccess: async ({ achievementKey }) => {
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
      
      // Fetch achievement details for toast
      const { data: achievement } = await supabase
        .from("achievements")
        .select("*")
        .eq("key", achievementKey)
        .single();

      if (achievement) {
        triggerCelebration("achievement");
        toast.success(`${achievement.icon} Conquista Desbloqueada!`, {
          description: `${achievement.name}: ${achievement.description}`,
          duration: 5000,
        });
      }
    },
  });
}

/**
 * Get unlock statistics
 */
export function useUnlockStats() {
  const { data: requirements } = useUnlockRequirements();
  const { data: userUnlocks } = useUserUnlocks();
  const { data: gamificationSettings } = useGamificationEnabled();

  const totalFeatures = (requirements?.length || 0) + ALWAYS_UNLOCKED.length;
  const unlockedFeatures = gamificationSettings?.bypass 
    ? totalFeatures 
    : ALWAYS_UNLOCKED.length + (userUnlocks?.length || 0);
  
  const percentage = totalFeatures > 0 ? Math.round((unlockedFeatures / totalFeatures) * 100) : 0;

  return {
    unlocked: unlockedFeatures,
    total: totalFeatures,
    percentage,
    allUnlocked: unlockedFeatures >= totalFeatures,
  };
}

/**
 * Toggle gamification for user
 */
export function useToggleGamification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ gamification_enabled: enabled })
        .eq("id", user.id);

      if (error) throw error;
      return { enabled };
    },
    onSuccess: ({ enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["gamification-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      toast.success(enabled 
        ? "Gamificação ativada! Complete desafios para desbloquear funcionalidades."
        : "Gamificação desativada. Todas as funcionalidades estão disponíveis."
      );
    },
  });
}

/**
 * Mark onboarding as completed
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Skip gamification and unlock all features
 */
export function useSkipGamification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          gamification_enabled: false,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-unlocks"] });
      
      toast.success("Todas as funcionalidades foram desbloqueadas!");
    },
  });
}
