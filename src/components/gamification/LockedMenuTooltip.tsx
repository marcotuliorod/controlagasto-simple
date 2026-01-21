import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, BookOpen, Target, Calendar, Receipt } from "lucide-react";
import { UnlockProgress, UnlockRequirement } from "@/hooks/useGamification";

interface LockedMenuTooltipProps {
  children: ReactNode;
  requirement: UnlockRequirement;
  progress: UnlockProgress;
  isCollapsed: boolean;
}

export function LockedMenuTooltip({ 
  children, 
  requirement, 
  progress,
  isCollapsed 
}: LockedMenuTooltipProps) {
  const navigate = useNavigate();

  const hasEducationReq = requirement.required_educational_category && requirement.required_educational_count;
  const hasQuizReq = requirement.required_quiz_category && requirement.required_quiz_score;
  const hasExpenseReq = requirement.required_expense_count;
  const hasDaysReq = requirement.required_days_active;

  const educationProgress = hasEducationReq 
    ? Math.min(100, (progress.educationCompleted / progress.educationRequired) * 100)
    : 0;

  const quizProgress = hasQuizReq && progress.quizBestScore
    ? Math.min(100, (progress.quizBestScore / (progress.quizRequiredScore || 100)) * 100)
    : 0;

  const expenseProgress = hasExpenseReq
    ? Math.min(100, (progress.expenseCount / (progress.expenseRequired || 1)) * 100)
    : 0;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent 
        side={isCollapsed ? "right" : "bottom"} 
        className="w-64 p-0"
        sideOffset={8}
      >
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Funcionalidade Bloqueada</p>
              <p className="text-xs text-muted-foreground">
                Nível {requirement.unlock_level}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {requirement.unlock_message}
          </p>

          <div className="space-y-2">
            {hasEducationReq && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>Educação</span>
                  </div>
                  <span className="text-muted-foreground">
                    {progress.educationCompleted}/{progress.educationRequired}
                  </span>
                </div>
                <Progress value={educationProgress} className="h-1.5" />
              </div>
            )}

            {hasQuizReq && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>Quiz</span>
                  </div>
                  <span className="text-muted-foreground">
                    {progress.quizBestScore ?? 0}% / {progress.quizRequiredScore}%
                  </span>
                </div>
                <Progress value={quizProgress} className="h-1.5" />
              </div>
            )}

            {hasExpenseReq && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    <span>Despesas</span>
                  </div>
                  <span className="text-muted-foreground">
                    {progress.expenseCount}/{progress.expenseRequired}
                  </span>
                </div>
                <Progress value={expenseProgress} className="h-1.5" />
              </div>
            )}

            {hasDaysReq && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Dias Ativos</span>
                  </div>
                  <span className="text-muted-foreground">
                    {progress.daysActive}/{progress.daysRequired}
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (progress.daysActive / (progress.daysRequired || 1)) * 100)} 
                  className="h-1.5" 
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1 h-7 text-xs"
              onClick={() => navigate("/education")}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Aprender
            </Button>
            {hasQuizReq && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 h-7 text-xs"
                onClick={() => navigate("/quiz")}
              >
                <Target className="h-3 w-3 mr-1" />
                Quiz
              </Button>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
