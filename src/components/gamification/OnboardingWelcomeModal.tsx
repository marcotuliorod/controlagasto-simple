import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  Target, 
  Unlock, 
  Trophy,
  Sparkles,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { 
  useGamificationEnabled, 
  useCompleteOnboarding, 
  useSkipGamification 
} from "@/hooks/useGamification";

const steps = [
  {
    icon: BookOpen,
    title: "1. Aprenda Conceitos Financeiros",
    description: "Complete módulos educacionais para entender os tópicos",
  },
  {
    icon: Target,
    title: "2. Teste seu Conhecimento",
    description: "Faça quizzes para provar que entendeu os conceitos",
  },
  {
    icon: Unlock,
    title: "3. Desbloqueie Funcionalidades",
    description: "Conforme aprende, novas funcionalidades ficam disponíveis",
  },
  {
    icon: Trophy,
    title: "4. Ganhe Conquistas",
    description: "Colecione medalhas enquanto progride e domina novas habilidades",
  },
];

export function OnboardingWelcomeModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const { data: gamificationSettings, isLoading } = useGamificationEnabled();
  const completeOnboarding = useCompleteOnboarding();
  const skipGamification = useSkipGamification();

  useEffect(() => {
    if (!isLoading && gamificationSettings) {
      // Show modal if gamification is enabled and onboarding not completed
      if (gamificationSettings.enabled && !gamificationSettings.onboardingCompleted && !gamificationSettings.bypass) {
        setOpen(true);
      }
    }
  }, [gamificationSettings, isLoading]);

  const handleStartLearning = () => {
    completeOnboarding.mutate();
    setOpen(false);
    navigate("/education");
  };

  const handleSkip = () => {
    skipGamification.mutate();
    setOpen(false);
  };

  const handleClose = () => {
    completeOnboarding.mutate();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            Bem-vindo ao Entenda seus Gastos! 🎉
          </DialogTitle>
          <DialogDescription>
            Aprenda finanças enquanto desbloqueia funcionalidades
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <div className="p-2 rounded-md bg-background">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Alert className="bg-primary/5 border-primary/20">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs">
            <strong>Dica:</strong> Comece pelo curso de "Orçamento" para desbloquear 
            os Relatórios. Itens bloqueados mostram 🔒 no menu.
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            disabled={skipGamification.isPending}
            className="text-muted-foreground"
          >
            Pular (Desbloquear Tudo)
          </Button>
          <Button 
            onClick={handleStartLearning}
            disabled={completeOnboarding.isPending}
            className="gap-2"
          >
            Começar a Aprender
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
