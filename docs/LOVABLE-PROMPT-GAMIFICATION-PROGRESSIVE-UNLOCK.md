# Lovable Prompt: Gamification - Progressive Menu Unlock System

> **Nota histórica.** Este documento descreve o projeto quando ele ainda rodava na
> plataforma Lovable. Essa dependência foi removida em 16/08/2026 — as menções
> abaixo são registro do que existiu, não da arquitetura atual.
> Ver `docs/architecture.md` e `services/ai/README.md`.

## Feature Request

Implement a gamification system that progressively unlocks sidebar menu items as users complete educational courses and quiz questions, creating an engaging onboarding experience that teaches financial literacy while introducing app features.

---

## Context

**Current State:**
- All menu items are accessible immediately after signup
- Users feel overwhelmed by too many options
- Educational content and quiz are optional features that users ignore
- No incentive to learn financial concepts before using advanced features
- 70% of new users abandon the app within first week

**Desired State:**
- Menu items unlock progressively based on achievements
- Users complete educational content to unlock features
- Clear progression path from basic to advanced features
- Visual feedback showing locked/unlocked states
- Gamification encourages financial literacy education
- Increased user engagement and retention

---

## User Stories

### US1: Progressive Menu Unlock System
**As a** new user,
**I want to** see which features are locked and how to unlock them,
**So that** I'm motivated to learn and progress through the app.

**Acceptance Criteria:**
- [ ] Menu items show locked/unlocked state visually
- [ ] Locked items display unlock requirements on hover/click
- [ ] Unlock requirements are clear: "Complete 3 educational articles" or "Score 80% on Budget Quiz"
- [ ] Unlocking triggers celebration animation (confetti, toast)
- [ ] Progress bar shows overall unlock completion (e.g., "6/12 features unlocked")
- [ ] User can always see what's locked and how to unlock it

### US2: Educational Content Completion Tracking
**As a** user,
**I want my** educational progress to count toward unlocking features,
**So that** I'm rewarded for learning financial concepts.

**Acceptance Criteria:**
- [ ] Mark educational content as "completed" when user finishes reading
- [ ] Track completion per content item in `user_content_progress` table
- [ ] Calculate completion percentage per category
- [ ] Unlock menu items when category completion threshold met
- [ ] Show badge on menu item: "🎓 Unlocked by learning!"
- [ ] Celebrate first unlock with special animation

### US3: Quiz Performance Unlocks
**As a** user,
**I want to** unlock advanced features by scoring well on quizzes,
**So that** I prove my financial knowledge before accessing complex tools.

**Acceptance Criteria:**
- [ ] Track quiz scores per category
- [ ] Require minimum score to unlock related features (e.g., 70% on Investment Quiz → unlock Investment Simulator)
- [ ] Allow retaking quizzes to improve score
- [ ] Show current score and required score on locked items
- [ ] Badge on unlocked items: "🏆 Unlocked by quiz mastery!"
- [ ] Leaderboard (optional): compare scores with friends

### US4: First-Time User Experience (FTUE)
**As a** new user,
**I want** a guided onboarding that explains the unlock system,
**So that** I understand how to progress and unlock features.

**Acceptance Criteria:**
- [ ] Welcome modal on first login explains gamification system
- [ ] Tutorial tooltips highlight locked vs unlocked items
- [ ] Suggested learning path: "Start here to unlock Budgets →"
- [ ] Skip option for advanced users (unlock all with confirmation)
- [ ] Persistent help icon to re-show onboarding tutorial
- [ ] Onboarding completion tracked in user profile

### US5: Achievement System
**As a** user,
**I want to** earn achievements for completing milestones,
**So that** I feel accomplished and motivated to continue.

**Acceptance Criteria:**
- [ ] Award achievements for unlock milestones:
  - 🎯 "First Steps" - Unlock first menu item
  - 📚 "Student" - Complete 5 educational articles
  - 🧠 "Scholar" - Score 100% on any quiz
  - 🚀 "Power User" - Unlock all features
  - 💰 "Budget Master" - Use budgets for 30 days straight
- [ ] Show achievements in user profile page
- [ ] Share achievements (optional): "I just unlocked all features!"
- [ ] Achievement notifications with celebratory design

### US6: Admin Override & Testing
**As an** admin/developer,
**I want to** bypass unlock requirements for testing,
**So that** I can test all features without completing educational content.

**Acceptance Criteria:**
- [ ] Admin flag in database: `is_admin` or `bypass_unlock_requirements`
- [ ] Environment variable: `VITE_DISABLE_GAMIFICATION=true` for local dev
- [ ] Settings page option (admin only): "Unlock all features"
- [ ] Preserve unlock state after override disabled
- [ ] Audit log of manual unlocks

---

## Progressive Unlock Map

### Level 1: Essentials (Unlocked by Default)
**Always Available** - No requirements

| Menu Item | Icon | Description |
|-----------|------|-------------|
| 🏠 Dashboard | Home | Overview of finances |
| ➕ Add Expense | Plus | Basic expense entry |
| 📋 Expenses | List | View expense list |
| 📚 Education | Book | Educational content hub |
| 🎯 Quiz | Target | Financial literacy quiz |
| ⚙️ Settings | Gear | Account settings |

**Rationale:** Users need basic functionality immediately to add expenses and learn.

---

### Level 2: Budget & Planning
**Unlock Requirement:** Complete "Budget Basics" educational module (3 articles) OR Score 70%+ on "Budget Quiz"

| Menu Item | Icon | Unlock Condition |
|-----------|------|------------------|
| 💰 Budget Goals | Target | Complete "Budget Basics" module (3/3 articles) |
| 📊 Reports | Chart | Complete "Understanding Reports" module (2/2 articles) |

**Educational Modules:**
- "Budget Basics" category:
  1. "What is a Budget?" (5 min read)
  2. "Setting Realistic Budget Goals" (7 min read)
  3. "Tracking Your Budget" (6 min read)

**Quiz:** "Budget Quiz" - 10 questions, need 7/10 correct (70%)

**Unlock Message:**
```
🔒 Budget Goals - Locked

Complete the "Budget Basics" course to unlock this feature.
Progress: 1/3 articles completed

[View Course] [Take Quiz Instead]
```

---

### Level 3: Multi-Account & Advanced Tracking
**Unlock Requirement:** Complete "Account Management" module OR Use app for 7 days + Score 60%+ on "Tracking Quiz"

| Menu Item | Icon | Unlock Condition |
|-----------|------|------------------|
| 🏦 Accounts | Bank | Complete "Account Management" (2 articles) OR 7 days active usage |
| 🔁 Recurring Expenses | Repeat | Score 60%+ on "Tracking Quiz" |
| 🏷️ Tags & Filters | Tag | Complete "Organization Tips" (1 article) |

**Educational Modules:**
- "Account Management":
  1. "Managing Multiple Accounts" (5 min)
  2. "Account Types Explained" (4 min)

**Alternative Unlock:** Usage-based (7 consecutive days with ≥1 expense/day)

---

### Level 4: Analysis & Insights
**Unlock Requirement:** Complete "Financial Analysis" module + Score 80%+ on "Analysis Quiz"

| Menu Item | Icon | Unlock Condition |
|-----------|------|------------------|
| 💬 Chat Assistant | MessageSquare | Complete "AI Assistant Guide" + 10 expenses logged |
| 💡 Insights | Lightbulb | Score 80%+ on "Analysis Quiz" |
| 📈 Financial Health | TrendingUp | Complete "Health Score Explained" (1 article) |

**Quiz:** "Analysis Quiz" - 15 questions, need 12/15 correct (80%)

**Rationale:** Advanced AI features require understanding to use effectively.

---

### Level 5: Automation & Export
**Unlock Requirement:** Complete "Advanced Features" module + Have 50+ expenses + Score 70%+ on "Advanced Quiz"

| Menu Item | Icon | Unlock Condition |
|-----------|------|------------------|
| 📤 Scheduled Exports | Upload | Complete "Export Guide" + 50+ expenses |
| 📥 Import Statements | Download | Score 70%+ on "Advanced Quiz" |
| 📋 Audit Logs | FileText | Complete "Security & Auditing" (1 article) |

**Rationale:** These are power-user features that require data to be useful.

---

### Level 6: Financial Tools & Simulators
**Unlock Requirement:** Complete "Investment Basics" module + Score 90%+ on "Investment Quiz"

| Menu Item | Icon | Unlock Condition |
|-----------|------|------------------|
| 🧮 Simulators | Calculator | Complete "Investment Basics" (4 articles) |
| 📊 Investment Tracking (future) | TrendingUp | Score 90%+ on "Investment Quiz" |

**Educational Modules:**
- "Investment Basics":
  1. "Compound Interest Explained" (8 min)
  2. "Understanding Financing" (7 min)
  3. "Investment Types" (10 min)
  4. "Risk vs Return" (9 min)

**Quiz:** "Investment Quiz" - 20 questions, need 18/20 correct (90%)

---

## Technical Implementation

### Database Schema Changes

#### New Table: `unlock_requirements`
```sql
CREATE TABLE unlock_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_key TEXT UNIQUE NOT NULL, -- 'budget-goals', 'reports', 'chat-assistant', etc.
  unlock_level INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6

  -- Unlock conditions (at least one must be met)
  required_educational_modules TEXT[], -- Category names: ['budget-basics', 'account-management']
  required_quiz_category TEXT, -- 'budget', 'tracking', 'investment'
  required_quiz_score INTEGER, -- Minimum score percentage (70, 80, 90)
  required_days_active INTEGER, -- Days with at least 1 expense
  required_expense_count INTEGER, -- Minimum expenses logged
  required_achievements TEXT[], -- Achievement IDs

  -- Metadata
  unlock_message TEXT, -- Message shown when locked
  unlock_celebration TEXT, -- Special message on unlock
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sample data
INSERT INTO unlock_requirements (menu_item_key, unlock_level, required_educational_modules, unlock_message) VALUES
('budget-goals', 2, ARRAY['budget-basics'], 'Complete the "Budget Basics" course to unlock Budget Goals'),
('reports', 2, ARRAY['understanding-reports'], 'Learn how to read reports before accessing this feature'),
('accounts', 3, ARRAY['account-management'], 'Complete "Account Management" to unlock multi-account features'),
('chat-assistant', 4, ARRAY['ai-assistant-guide'], 'Learn about AI assistance before using this feature'),
('simulators', 6, ARRAY['investment-basics'], 'Master investment concepts to unlock financial simulators');
```

#### New Table: `user_unlocks`
```sql
CREATE TABLE user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  menu_item_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  unlock_method TEXT, -- 'education', 'quiz', 'achievement', 'usage', 'admin_override'
  unlock_details JSONB, -- { "quiz_score": 85, "module": "budget-basics" }

  UNIQUE(user_id, menu_item_key)
);

CREATE INDEX idx_user_unlocks_user ON user_unlocks(user_id);
```

#### New Table: `achievements`
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- 'first-unlock', 'quiz-master', 'power-user'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- Emoji or icon name
  rarity TEXT, -- 'common', 'rare', 'epic', 'legendary'
  unlock_condition JSONB, -- { "type": "unlock_count", "count": 5 }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sample achievements
INSERT INTO achievements (key, name, description, icon, rarity, unlock_condition) VALUES
('first-unlock', 'First Steps', 'Unlocked your first feature', '🎯', 'common', '{"type": "unlock_count", "count": 1}'),
('student', 'Student', 'Completed 5 educational articles', '📚', 'common', '{"type": "education_count", "count": 5}'),
('scholar', 'Scholar', 'Scored 100% on any quiz', '🧠', 'rare', '{"type": "quiz_perfect_score"}'),
('power-user', 'Power User', 'Unlocked all features', '🚀', 'legendary', '{"type": "unlock_all"}'),
('budget-master', 'Budget Master', 'Used budgets for 30 consecutive days', '💰', 'epic', '{"type": "budget_streak", "days": 30}');
```

#### New Table: `user_achievements`
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

#### Update `profiles` Table
```sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN gamification_enabled BOOLEAN DEFAULT true,
  ADD COLUMN bypass_unlock_requirements BOOLEAN DEFAULT false; -- Admin override
```

---

### Backend Implementation

#### New RPC Function: `check_unlock_status`
```sql
CREATE OR REPLACE FUNCTION check_unlock_status(p_user_id UUID, p_menu_item_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requirements RECORD;
  v_is_unlocked BOOLEAN := false;
  v_progress JSONB;
  v_bypass BOOLEAN;
BEGIN
  -- Check if user has bypass enabled
  SELECT bypass_unlock_requirements INTO v_bypass
  FROM profiles WHERE id = p_user_id;

  IF v_bypass THEN
    RETURN jsonb_build_object('unlocked', true, 'method', 'admin_override');
  END IF;

  -- Check if already unlocked
  IF EXISTS (SELECT 1 FROM user_unlocks WHERE user_id = p_user_id AND menu_item_key = p_menu_item_key) THEN
    RETURN jsonb_build_object('unlocked', true, 'method', 'previously_unlocked');
  END IF;

  -- Get unlock requirements
  SELECT * INTO v_requirements FROM unlock_requirements WHERE menu_item_key = p_menu_item_key;

  IF NOT FOUND THEN
    -- No requirements = always unlocked
    RETURN jsonb_build_object('unlocked', true, 'method', 'no_requirements');
  END IF;

  -- Check educational module completion
  IF v_requirements.required_educational_modules IS NOT NULL THEN
    DECLARE
      v_completed_count INTEGER;
      v_required_count INTEGER;
    BEGIN
      SELECT COUNT(DISTINCT content_id) INTO v_completed_count
      FROM user_content_progress ucp
      JOIN educational_content ec ON ucp.content_id = ec.id
      WHERE ucp.user_id = p_user_id
        AND ucp.completed = true
        AND ec.category = ANY(v_requirements.required_educational_modules);

      SELECT COUNT(*) INTO v_required_count
      FROM educational_content
      WHERE category = ANY(v_requirements.required_educational_modules);

      IF v_completed_count >= v_required_count THEN
        v_is_unlocked := true;
      END IF;

      v_progress := jsonb_build_object(
        'education_completed', v_completed_count,
        'education_required', v_required_count
      );
    END;
  END IF;

  -- Check quiz score
  IF NOT v_is_unlocked AND v_requirements.required_quiz_category IS NOT NULL THEN
    DECLARE
      v_best_score NUMERIC;
    BEGIN
      SELECT MAX(
        (COUNT(*) FILTER (WHERE is_correct) * 100.0) / COUNT(*)
      ) INTO v_best_score
      FROM quiz_responses qr
      JOIN quiz_questions qq ON qr.question_id = qq.id
      WHERE qr.user_id = p_user_id
        AND qq.category = v_requirements.required_quiz_category
      GROUP BY DATE_TRUNC('day', qr.completed_at);

      IF v_best_score >= v_requirements.required_quiz_score THEN
        v_is_unlocked := true;
      END IF;

      v_progress := v_progress || jsonb_build_object(
        'quiz_best_score', COALESCE(v_best_score, 0),
        'quiz_required_score', v_requirements.required_quiz_score
      );
    END;
  END IF;

  -- Check days active
  IF NOT v_is_unlocked AND v_requirements.required_days_active IS NOT NULL THEN
    DECLARE
      v_days_active INTEGER;
    BEGIN
      SELECT COUNT(DISTINCT DATE(created_at)) INTO v_days_active
      FROM expenses
      WHERE user_id = p_user_id
        AND created_at >= NOW() - INTERVAL '30 days';

      IF v_days_active >= v_requirements.required_days_active THEN
        v_is_unlocked := true;
      END IF;

      v_progress := v_progress || jsonb_build_object(
        'days_active', v_days_active,
        'days_required', v_requirements.required_days_active
      );
    END;
  END IF;

  -- Check expense count
  IF NOT v_is_unlocked AND v_requirements.required_expense_count IS NOT NULL THEN
    DECLARE
      v_expense_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_expense_count
      FROM expenses
      WHERE user_id = p_user_id;

      IF v_expense_count >= v_requirements.required_expense_count THEN
        v_is_unlocked := true;
      END IF;

      v_progress := v_progress || jsonb_build_object(
        'expense_count', v_expense_count,
        'expense_required', v_requirements.required_expense_count
      );
    END;
  END IF;

  RETURN jsonb_build_object(
    'unlocked', v_is_unlocked,
    'progress', v_progress,
    'unlock_message', v_requirements.unlock_message
  );
END;
$$;
```

#### New RPC Function: `unlock_menu_item`
```sql
CREATE OR REPLACE FUNCTION unlock_menu_item(
  p_user_id UUID,
  p_menu_item_key TEXT,
  p_method TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_unlocks (user_id, menu_item_key, unlock_method, unlock_details)
  VALUES (p_user_id, p_menu_item_key, p_method, p_details)
  ON CONFLICT (user_id, menu_item_key) DO NOTHING;

  -- Check for achievements
  PERFORM check_and_award_achievements(p_user_id);

  RETURN true;
END;
$$;
```

#### New RPC Function: `check_and_award_achievements`
```sql
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_unlock_count INTEGER;
  v_education_count INTEGER;
BEGIN
  -- Count unlocks
  SELECT COUNT(*) INTO v_unlock_count FROM user_unlocks WHERE user_id = p_user_id;

  -- Count completed education
  SELECT COUNT(*) INTO v_education_count
  FROM user_content_progress
  WHERE user_id = p_user_id AND completed = true;

  -- Check each achievement
  FOR v_achievement IN SELECT * FROM achievements LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_key = v_achievement.key) THEN
      CONTINUE;
    END IF;

    -- Check unlock_count achievements
    IF v_achievement.unlock_condition->>'type' = 'unlock_count' THEN
      IF v_unlock_count >= (v_achievement.unlock_condition->>'count')::INTEGER THEN
        INSERT INTO user_achievements (user_id, achievement_key) VALUES (p_user_id, v_achievement.key);
      END IF;
    END IF;

    -- Check education_count achievements
    IF v_achievement.unlock_condition->>'type' = 'education_count' THEN
      IF v_education_count >= (v_achievement.unlock_condition->>'count')::INTEGER THEN
        INSERT INTO user_achievements (user_id, achievement_key) VALUES (p_user_id, v_achievement.key);
      END IF;
    END IF;

    -- Check quiz_perfect_score
    IF v_achievement.unlock_condition->>'type' = 'quiz_perfect_score' THEN
      IF EXISTS (
        SELECT 1 FROM quiz_responses qr
        JOIN quiz_questions qq ON qr.question_id = qq.id
        WHERE qr.user_id = p_user_id
        GROUP BY DATE_TRUNC('day', qr.completed_at), qq.category
        HAVING COUNT(*) FILTER (WHERE is_correct) = COUNT(*)
      ) THEN
        INSERT INTO user_achievements (user_id, achievement_key) VALUES (p_user_id, v_achievement.key);
      END IF;
    END IF;

    -- Check unlock_all
    IF v_achievement.unlock_condition->>'type' = 'unlock_all' THEN
      DECLARE
        v_total_menu_items INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_total_menu_items FROM unlock_requirements;
        IF v_unlock_count >= v_total_menu_items THEN
          INSERT INTO user_achievements (user_id, achievement_key) VALUES (p_user_id, v_achievement.key);
        END IF;
      END;
    END IF;
  END LOOP;
END;
$$;
```

---

### Frontend Implementation

#### New Hook: `useUnlockStatus`
```typescript
// src/hooks/useUnlockStatus.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function useUnlockStatus(menuItemKey: string) {
  const { data: session } = useSession();

  const { data: unlockStatus, refetch } = useQuery({
    queryKey: ['unlock-status', menuItemKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_unlock_status', {
        p_user_id: session?.user.id,
        p_menu_item_key: menuItemKey
      });

      if (error) throw error;
      return data as {
        unlocked: boolean;
        progress?: {
          education_completed?: number;
          education_required?: number;
          quiz_best_score?: number;
          quiz_required_score?: number;
          days_active?: number;
          days_required?: number;
          expense_count?: number;
          expense_required?: number;
        };
        unlock_message?: string;
      };
    },
    enabled: !!session?.user.id
  });

  const unlockMutation = useMutation({
    mutationFn: async ({ method, details }: { method: string; details?: any }) => {
      const { data, error } = await supabase.rpc('unlock_menu_item', {
        p_user_id: session?.user.id,
        p_menu_item_key: menuItemKey,
        p_method: method,
        p_details: details || {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success('🎉 Feature Unlocked!', {
        description: `You can now access ${menuItemKey.replace('-', ' ')}!`
      });

      refetch();
    }
  });

  return {
    isUnlocked: unlockStatus?.unlocked ?? false,
    progress: unlockStatus?.progress,
    unlockMessage: unlockStatus?.unlock_message,
    unlock: unlockMutation.mutate,
    refetch
  };
}
```

#### New Hook: `useAchievements`
```typescript
// src/hooks/useAchievements.ts
export function useAchievements() {
  const { data: session } = useSession();

  const { data: userAchievements } = useQuery({
    queryKey: ['user-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements:achievement_key (*)
        `)
        .eq('user_id', session?.user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id
  });

  return {
    achievements: userAchievements || [],
    count: userAchievements?.length || 0
  };
}
```

#### Enhanced AppSidebar Component
```tsx
// src/components/AppSidebar.tsx
import { useUnlockStatus } from '@/hooks/useUnlockStatus';
import { Lock, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MenuItem {
  key: string;
  title: string;
  icon: LucideIcon;
  url: string;
  level: number; // Unlock level
}

const menuItems: MenuItem[] = [
  // Level 1 - Always unlocked
  { key: 'dashboard', title: 'Dashboard', icon: Home, url: '/dashboard', level: 1 },
  { key: 'add-expense', title: 'Add Expense', icon: Plus, url: '/add-expense', level: 1 },
  { key: 'expenses', title: 'Expenses', icon: List, url: '/expenses', level: 1 },
  { key: 'education', title: 'Education', icon: BookOpen, url: '/education', level: 1 },
  { key: 'quiz', title: 'Quiz', icon: Target, url: '/quiz', level: 1 },

  // Level 2 - Requires budget education
  { key: 'budget-goals', title: 'Budget Goals', icon: Target, url: '/budget-goals', level: 2 },
  { key: 'reports', title: 'Reports', icon: BarChart, url: '/reports', level: 2 },

  // Level 3 - Requires account management
  { key: 'accounts', title: 'Accounts', icon: Wallet, url: '/accounts', level: 3 },
  { key: 'recurring-expenses', title: 'Recurring', icon: Repeat, url: '/recurring-expenses', level: 3 },

  // Level 4 - Requires analysis knowledge
  { key: 'chat-assistant', title: 'AI Assistant', icon: MessageSquare, url: '/chat', level: 4 },
  { key: 'insights', title: 'Insights', icon: Lightbulb, url: '/insights', level: 4 },
  { key: 'financial-health', title: 'Health Score', icon: TrendingUp, url: '/financial-health', level: 4 },

  // Level 5 - Power user features
  { key: 'scheduled-exports', title: 'Scheduled Exports', icon: Upload, url: '/scheduled-exports', level: 5 },
  { key: 'import-statement', title: 'Import Statement', icon: Download, url: '/import-statement', level: 5 },
  { key: 'audit-logs', title: 'Audit Logs', icon: FileText, url: '/audit-logs', level: 5 },

  // Level 6 - Advanced financial tools
  { key: 'simulators', title: 'Simulators', icon: Calculator, url: '/simulator', level: 6 },

  // Always available
  { key: 'settings', title: 'Settings', icon: Settings, url: '/settings', level: 1 },
];

function SidebarMenuItem({ item }: { item: MenuItem }) {
  const { isUnlocked, progress, unlockMessage } = useUnlockStatus(item.key);
  const navigate = useNavigate();

  // Level 1 items are always unlocked
  const alwaysUnlocked = item.level === 1;
  const canAccess = alwaysUnlocked || isUnlocked;

  const handleClick = () => {
    if (canAccess) {
      navigate(item.url);
    } else {
      toast.info('Feature Locked', {
        description: unlockMessage || 'Complete requirements to unlock this feature',
        action: {
          label: 'Learn How',
          onClick: () => navigate('/education')
        }
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            onClick={handleClick}
            className={cn(
              'relative',
              !canAccess && 'opacity-50 cursor-not-allowed'
            )}
            disabled={!canAccess}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>

            {!canAccess && (
              <Lock className="h-3 w-3 ml-auto text-muted-foreground" />
            )}

            {canAccess && !alwaysUnlocked && (
              <CheckCircle className="h-3 w-3 ml-auto text-green-500" />
            )}
          </SidebarMenuButton>
        </TooltipTrigger>

        {!canAccess && (
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">🔒 Locked</p>
              <p className="text-sm text-muted-foreground">
                {unlockMessage || 'Complete requirements to unlock'}
              </p>

              {progress && (
                <div className="space-y-1 text-xs">
                  {progress.education_completed !== undefined && (
                    <p>📚 Education: {progress.education_completed}/{progress.education_required}</p>
                  )}
                  {progress.quiz_best_score !== undefined && (
                    <p>🎯 Quiz Score: {progress.quiz_best_score}% (need {progress.quiz_required_score}%)</p>
                  )}
                  {progress.days_active !== undefined && (
                    <p>📅 Active Days: {progress.days_active}/{progress.days_required}</p>
                  )}
                  {progress.expense_count !== undefined && (
                    <p>💸 Expenses: {progress.expense_count}/{progress.expense_required}</p>
                  )}
                </div>
              )}

              <Button size="sm" variant="outline" onClick={() => navigate('/education')}>
                Start Learning →
              </Button>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  // ... existing sidebar code

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.key} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <UnlockProgressIndicator />
      </SidebarContent>
    </Sidebar>
  );
}
```

#### Unlock Progress Indicator
```tsx
// src/components/UnlockProgressIndicator.tsx
export function UnlockProgressIndicator() {
  const { data: session } = useSession();

  const { data: stats } = useQuery({
    queryKey: ['unlock-stats'],
    queryFn: async () => {
      const { count: unlockedCount } = await supabase
        .from('user_unlocks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session?.user.id);

      const { count: totalCount } = await supabase
        .from('unlock_requirements')
        .select('*', { count: 'exact', head: true });

      return { unlocked: unlockedCount || 0, total: totalCount || 0 };
    },
    enabled: !!session?.user.id
  });

  const percentage = stats ? (stats.unlocked / stats.total) * 100 : 0;

  return (
    <div className="p-4 border-t">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{stats?.unlocked}/{stats?.total} unlocked</span>
        </div>

        <Progress value={percentage} className="h-2" />

        {percentage < 100 && (
          <p className="text-xs text-muted-foreground">
            Keep learning to unlock more features!
          </p>
        )}

        {percentage === 100 && (
          <p className="text-xs text-green-600 font-medium">
            🎉 All features unlocked!
          </p>
        )}
      </div>
    </div>
  );
}
```

#### Onboarding Welcome Modal
```tsx
// src/components/OnboardingWelcomeModal.tsx
export function OnboardingWelcomeModal() {
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      setOpen(true);
    }
  }, [profile]);

  const handleComplete = async () => {
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', profile?.id);

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Entenda seus Gastos! 🎉</DialogTitle>
          <DialogDescription>
            Learn as you go with our progressive unlock system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">1. Learn Financial Concepts</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete educational modules to understand financial topics
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">2. Test Your Knowledge</h4>
                  <p className="text-sm text-muted-foreground">
                    Take quizzes to prove you understand the concepts
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Unlock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">3. Unlock Features</h4>
                  <p className="text-sm text-muted-foreground">
                    As you learn, new app features become available
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">4. Earn Achievements</h4>
                  <p className="text-sm text-muted-foreground">
                    Collect badges as you progress and master new skills
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Pro Tip</AlertTitle>
            <AlertDescription>
              Start with the "Budget Basics" course to unlock budgeting features.
              Locked features show 🔒 in the menu.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Skip (Unlock Everything)
          </Button>
          <Button onClick={handleComplete}>
            Start Learning! 📚
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Achievement Celebration
```tsx
// src/components/AchievementToast.tsx
export function showAchievementToast(achievement: Achievement) {
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5 }
  });

  toast.custom((t) => (
    <div className="bg-card border-2 border-primary rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex-1">
          <h4 className="font-bold text-lg">Achievement Unlocked!</h4>
          <p className="font-medium">{achievement.name}</p>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
        </div>
        <Badge variant={achievement.rarity === 'legendary' ? 'default' : 'secondary'}>
          {achievement.rarity}
        </Badge>
      </div>
    </div>
  ), { duration: 5000 });
}
```

---

## Testing Strategy

### E2E Test: Progressive Unlock Flow
```typescript
// e2e/gamification-unlock.spec.ts
test.describe('Gamification - Progressive Unlock', () => {
  test('should show locked features for new users', async ({ page }) => {
    await signUp(page, 'newuser@test.com');
    await page.goto('/dashboard');

    // Check sidebar shows locked items
    const budgetGoalsItem = page.locator('[data-menu-item="budget-goals"]');
    await expect(budgetGoalsItem).toContainText('Budget Goals');
    await expect(budgetGoalsItem.locator('svg[data-icon="lock"]')).toBeVisible();

    // Hover shows unlock requirements
    await budgetGoalsItem.hover();
    await expect(page.getByText('Complete the "Budget Basics" course')).toBeVisible();
  });

  test('should unlock feature after completing education', async ({ page }) => {
    await signUp(page);

    // Navigate to education
    await page.click('[data-menu-item="education"]');

    // Complete "Budget Basics" module
    await page.click('text=Budget Basics');
    await page.click('text=What is a Budget?');
    await page.click('button:has-text("Mark as Completed")');

    // Navigate to next article
    await page.click('text=Setting Realistic Budget Goals');
    await page.click('button:has-text("Mark as Completed")');

    // Complete third article
    await page.click('text=Tracking Your Budget');
    await page.click('button:has-text("Mark as Completed")');

    // Check for unlock celebration
    await expect(page.getByText('🎉 Feature Unlocked!')).toBeVisible();
    await expect(page.getByText('Budget Goals')).toBeVisible();

    // Verify menu item is now unlocked
    await page.click('[data-menu-item="budget-goals"]');
    await expect(page).toHaveURL(/\/budget-goals/);
  });

  test('should unlock feature via quiz completion', async ({ page }) => {
    await signUp(page);

    // Take Budget Quiz
    await page.click('[data-menu-item="quiz"]');
    await page.click('text=Budget Quiz');

    // Answer 8/10 correctly (80% - enough to unlock)
    for (let i = 0; i < 10; i++) {
      // Select correct answer (in test data)
      await page.click(`[data-question="${i}"] [data-correct="true"]`);
      await page.click('button:has-text("Next")');
    }

    await page.click('button:has-text("Submit Quiz")');

    // Check score
    await expect(page.getByText('80%')).toBeVisible();

    // Check unlock notification
    await expect(page.getByText('Feature Unlocked!')).toBeVisible();

    // Verify unlock
    await page.click('[data-menu-item="budget-goals"]');
    await expect(page).toHaveURL(/\/budget-goals/);
  });

  test('should show progress indicators', async ({ page }) => {
    await signUp(page);

    // Check unlock progress in sidebar
    await expect(page.getByText(/\d+\/\d+ unlocked/)).toBeVisible();

    // Complete one module
    await page.click('[data-menu-item="education"]');
    await page.click('text=Budget Basics');
    await page.click('text=What is a Budget?');
    await page.click('button:has-text("Mark as Completed")');

    // Check locked item progress
    const budgetItem = page.locator('[data-menu-item="budget-goals"]');
    await budgetItem.hover();
    await expect(page.getByText('Education: 1/3')).toBeVisible();
  });

  test('should award achievements', async ({ page }) => {
    await signUp(page);

    // Complete first educational article
    await page.click('[data-menu-item="education"]');
    await page.click('text=Budget Basics');
    await page.click('text=What is a Budget?');
    await page.click('button:has-text("Mark as Completed")');

    // Should award "First Steps" achievement (first unlock)
    // (Budget Goals unlocks after 3 articles, so this tests the achievement system)

    // Check profile for achievements
    await page.click('[data-menu-item="settings"]');
    await page.click('text=Profile');

    // Eventually should show achievements section
    // await expect(page.getByText('🎯 First Steps')).toBeVisible();
  });
});
```

---

## Migration & Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Deploy with gamification **disabled by default**
- Add opt-in toggle in settings: "Try Progressive Unlock (Beta)"
- Test with 10% of new users
- Collect feedback

### Phase 2: New Users Only (Week 2-3)
- Enable for all new signups
- Existing users keep full access
- Monitor engagement metrics:
  - Education completion rate
  - Quiz participation rate
  - Feature unlock rate
  - User retention (D7, D30)

### Phase 3: Optional for Existing Users (Week 4)
- Add banner: "Try our new learning path!"
- Existing users can opt-in to reset and re-unlock
- Incentive: "Unlock achievements by completing modules"

### Phase 4: Full Rollout (Month 2)
- Enable for all users
- Existing users: all features stay unlocked
- Show achievements for past usage

---

## Success Metrics

### Primary KPIs
- **Education Engagement:** 60% of new users complete ≥1 module (vs 15% current)
- **Quiz Participation:** 40% take ≥1 quiz (vs 5% current)
- **D7 Retention:** 50% (vs 30% current)
- **D30 Retention:** 35% (vs 18% current)

### Secondary KPIs
- Average unlocks per user: 8/12 features
- Time to first unlock: <20 minutes
- Education module completion rate: 70%
- Quiz avg score: 75%
- Achievement collection rate: 3+ per user

### User Satisfaction
- NPS for gamification system: >40
- Helpfulness rating: >4/5
- "Feature overwhelm" complaints: -80%

---

## Future Enhancements

- [ ] Leaderboards (compare with friends)
- [ ] Daily/weekly challenges for extra unlocks
- [ ] Limited-time achievements
- [ ] Customizable unlock paths
- [ ] Social sharing of achievements
- [ ] Premium achievements for paid tier
- [ ] Unlock hints ("You're 1 article away from unlocking Reports!")
- [ ] Unlock animations (different for each level)
- [ ] Achievement showcase on profile

---

**Priority:** HIGH (improves onboarding & engagement)
**Estimated Effort:** 10-12 days
**Target Release:** v9.2.0

**Implementation Breakdown:**
- Days 1-2: Database schema + RPC functions
- Days 3-4: Backend unlock logic + achievement system
- Days 5-7: Frontend components (sidebar, tooltips, progress)
- Days 8-9: Onboarding flow + celebration animations
- Days 10: E2E tests
- Days 11-12: Polish + documentation

---

**End of Prompt**

Implement this gamification system to create an engaging, educational onboarding experience that teaches financial literacy while progressively introducing app features.
