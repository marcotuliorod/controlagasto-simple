import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Target, TrendingUp, Calendar } from "lucide-react";

interface PushOnboardingProps {
  onActivate: () => void;
  onDismiss: () => void;
}

export default function PushOnboarding({ onActivate, onDismiss }: PushOnboardingProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeenOnboarding = localStorage.getItem('push-onboarding-seen');
    
    if (!hasSeenOnboarding) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleActivate = () => {
    localStorage.setItem('push-onboarding-seen', 'true');
    setOpen(false);
    onActivate();
  };

  const handleDismiss = () => {
    localStorage.setItem('push-onboarding-seen', 'true');
    setOpen(false);
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Ative as Notificações
          </DialogTitle>
          <DialogDescription className="text-center">
            Receba alertas inteligentes para manter suas finanças sob controle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 mt-1">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Alertas de Meta</h4>
              <p className="text-xs text-muted-foreground">
                Seja avisado quando atingir 80% ou 100% do seu limite mensal
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 mt-1">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Insights Financeiros</h4>
              <p className="text-xs text-muted-foreground">
                Receba dicas personalizadas sobre seus hábitos de consumo
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 mt-1">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Lembretes</h4>
              <p className="text-xs text-muted-foreground">
                Não esqueça de registrar seus gastos diários
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleActivate} className="w-full" size="lg">
            <Bell className="mr-2 h-4 w-4" />
            Ativar Notificações
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
