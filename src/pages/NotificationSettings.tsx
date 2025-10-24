import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";

interface NotificationPreferences {
  budget_alert_threshold: number;
  spending_pattern_alert: boolean;
  expense_reminder_days: number;
  monthly_review_enabled: boolean;
  proactive_insights_enabled: boolean;
}

export default function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    budget_alert_threshold: 80,
    spending_pattern_alert: true,
    expense_reminder_days: 3,
    monthly_review_enabled: true,
    proactive_insights_enabled: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          budget_alert_threshold: data.budget_alert_threshold,
          spending_pattern_alert: data.spending_pattern_alert,
          expense_reminder_days: data.expense_reminder_days,
          monthly_review_enabled: data.monthly_review_enabled,
          proactive_insights_enabled: data.proactive_insights_enabled,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast.success("Preferências salvas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Notificações</h1>
            <p className="text-muted-foreground">Configure como deseja ser notificado</p>
          </div>
        </div>

        <Card className="p-6 space-y-8">
          {/* Budget Alerts */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Alertas de Orçamento</h3>
              <p className="text-sm text-muted-foreground">
                Receba alertas quando suas despesas atingirem um percentual do orçamento
              </p>
            </div>
            <div className="space-y-3">
              <Label>
                Alertar quando atingir: <span className="font-bold">{preferences.budget_alert_threshold}%</span>
              </Label>
              <Slider
                value={[preferences.budget_alert_threshold]}
                onValueChange={([value]) =>
                  setPreferences({ ...preferences, budget_alert_threshold: value })
                }
                min={50}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Spending Patterns */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="space-y-0.5">
              <Label>Padrões de Gastos Incomuns</Label>
              <p className="text-sm text-muted-foreground">
                Alerta quando detectar gastos fora do padrão habitual
              </p>
            </div>
            <Switch
              checked={preferences.spending_pattern_alert}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, spending_pattern_alert: checked })
              }
            />
          </div>

          {/* Expense Reminders */}
          <div className="space-y-4 pt-2 border-t">
            <div>
              <h3 className="font-semibold mb-1">Lembretes</h3>
              <p className="text-sm text-muted-foreground">
                Receba lembretes quando não registrar despesas
              </p>
            </div>
            <div className="space-y-3">
              <Label>
                Lembrar após: <span className="font-bold">{preferences.expense_reminder_days} dias</span>
              </Label>
              <Slider
                value={[preferences.expense_reminder_days]}
                onValueChange={([value]) =>
                  setPreferences({ ...preferences, expense_reminder_days: value })
                }
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 dia</span>
                <span>7 dias</span>
              </div>
            </div>
          </div>

          {/* Monthly Review */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="space-y-0.5">
              <Label>Revisão Mensal</Label>
              <p className="text-sm text-muted-foreground">
                Receba um resumo financeiro no início de cada mês
              </p>
            </div>
            <Switch
              checked={preferences.monthly_review_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, monthly_review_enabled: checked })
              }
            />
          </div>

          {/* Proactive Insights */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="space-y-0.5">
              <Label>Insights Proativos</Label>
              <p className="text-sm text-muted-foreground">
                Receba sugestões e dicas personalizadas baseadas nos seus hábitos
              </p>
            </div>
            <Switch
              checked={preferences.proactive_insights_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, proactive_insights_enabled: checked })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
