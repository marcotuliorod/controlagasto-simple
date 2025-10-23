import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User, Target, Mail, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useProfile, useUpdateProfile, useUserEmail, useUpdateEmail } from "@/hooks/useProfile";
import { useCurrentMonthGoal, useUpsertMonthlyGoal, useUpsertMultipleGoalsRPC } from "@/hooks/useGoals";
import { profileFormSchema, emailChangeSchema, goalsFormSchema, type ProfileFormData, type EmailChangeData, type GoalsFormData } from "@/schemas/profileSchema";
import { parseCurrencyBR, formatCurrencyBR, generateFutureMonths, getCurrentMonth } from "@/lib/currencyUtils";
import AppFooter from "@/components/AppFooter";
import CategoryGoalsManager from "@/components/CategoryGoalsManager";

export default function AccountProfile() {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Queries with error handling
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: userEmail } = useUserEmail();
  const { data: currentMonthGoal } = useCurrentMonthGoal();

  // Mutations
  const updateProfile = useUpdateProfile();
  const updateEmail = useUpdateEmail();
  const upsertMonthlyGoal = useUpsertMonthlyGoal();
  const upsertMultipleGoals = useUpsertMultipleGoalsRPC();

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Email form
  const emailForm = useForm<EmailChangeData>({
    resolver: zodResolver(emailChangeSchema),
  });

  // Goals form
  const goalsForm = useForm<GoalsFormData>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      defaultGoal: "",
      currentMonthGoal: "",
      propagateEnabled: false,
      propagateMonths: 3,
    },
  });

  // Update forms when data loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({ name: profile.name });
      goalsForm.reset({
        defaultGoal: formatCurrencyBR(profile.monthly_goal),
        currentMonthGoal: currentMonthGoal
          ? formatCurrencyBR(currentMonthGoal.total_limit)
          : formatCurrencyBR(profile.monthly_goal),
        billingCycleDay: profile.billing_cycle_day || 1,
        propagateEnabled: false,
        propagateMonths: 3,
      });
    }
  }, [profile, currentMonthGoal]);

  const propagateEnabled = goalsForm.watch("propagateEnabled");

  // Handlers
  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!profile) return;

    await updateProfile.mutateAsync({
      name: data.name,
      monthlyGoal: profile.monthly_goal, // Keep current monthly goal
    });
  };

  const onEmailSubmit = async (data: EmailChangeData) => {
    await updateEmail.mutateAsync(data.email);
    setEmailDialogOpen(false);
    emailForm.reset();
  };

  const onGoalsSubmit = async (data: GoalsFormData) => {
    try {
      const defaultGoalValue = parseCurrencyBR(data.defaultGoal);
      const currentMonthGoalValue = parseCurrencyBR(data.currentMonthGoal);

      // Update default goal and billing cycle day in profile
      if (profile) {
        await updateProfile.mutateAsync({
          name: profile.name,
          monthlyGoal: defaultGoalValue,
          billingCycleDay: data.billingCycleDay,
        });
      }

      // Upsert current month goal
      const currentMonth = getCurrentMonth();
      await upsertMonthlyGoal.mutateAsync({
        month: currentMonth,
        totalLimit: currentMonthGoalValue,
      });

      // Propagate to future months if enabled
      if (data.propagateEnabled && data.propagateMonths) {
        const futureMonths = generateFutureMonths(currentMonth, data.propagateMonths);
        await upsertMultipleGoals.mutateAsync({
          months: futureMonths,
          totalLimit: currentMonthGoalValue,
        });
      } else {
        toast.success("Metas salvas com sucesso!");
      }
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Erro ao salvar metas. Tente novamente.");
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro ao carregar perfil</CardTitle>
            <CardDescription>
              Não foi possível carregar suas informações. Tente recarregar a página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recarregar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Perfil & Metas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas informações pessoais e configure suas metas financeiras
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Data Card */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      {...profileForm.register("name")}
                      placeholder="Seu nome"
                      disabled={updateProfile.isPending}
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        value={userEmail || ""}
                        disabled
                        className="flex-1"
                      />
                      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Alterar E-mail</DialogTitle>
                            <DialogDescription>
                              Digite o novo e-mail. Você receberá um link de confirmação.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="newEmail">Novo E-mail</Label>
                              <Input
                                id="newEmail"
                                type="email"
                                {...emailForm.register("email")}
                                placeholder="novo@email.com"
                                disabled={updateEmail.isPending}
                              />
                              {emailForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                  {emailForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={updateEmail.isPending}
                            >
                              {updateEmail.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Solicitar Alteração
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfile.isPending || !profileForm.formState.isDirty}
                  >
                    {updateProfile.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Goals Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Metas
                </CardTitle>
                <CardDescription>
                  Configure suas metas financeiras mensais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={goalsForm.handleSubmit(onGoalsSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="defaultGoal" className="cursor-help">
                            Meta Padrão (R$)
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Meta aplicada a todos os meses, a menos que especificado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Input
                      id="defaultGoal"
                      {...goalsForm.register("defaultGoal")}
                      placeholder="1.234,56"
                      disabled={updateProfile.isPending}
                    />
                    {goalsForm.formState.errors.defaultGoal && (
                      <p className="text-sm text-destructive">
                        {goalsForm.formState.errors.defaultGoal.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="currentMonthGoal" className="cursor-help">
                            Meta do Mês Atual (R$)
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Meta específica para o mês corrente. Sobrescreve a meta padrão.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Input
                      id="currentMonthGoal"
                      {...goalsForm.register("currentMonthGoal")}
                      placeholder="1.234,56"
                      disabled={upsertMonthlyGoal.isPending}
                    />
                    {goalsForm.formState.errors.currentMonthGoal && (
                      <p className="text-sm text-destructive">
                        {goalsForm.formState.errors.currentMonthGoal.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label htmlFor="billingCycleDay" className="cursor-help flex items-center gap-1">
                                Dia de Início do Ciclo
                                <Info className="h-3 w-3" />
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Configure seu ciclo financeiro</p>
                              <p className="text-xs">
                                Se você recebe salário no dia 5, seu ciclo será de 05/Jan a 04/Fev.
                                Todas as metas e relatórios usarão este período.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Input
                          id="billingCycleDay"
                          type="number"
                          min={1}
                          max={28}
                          {...goalsForm.register("billingCycleDay", { valueAsNumber: true })}
                          placeholder="1"
                          disabled={updateProfile.isPending}
                        />
                        {goalsForm.formState.errors.billingCycleDay && (
                          <p className="text-sm text-destructive">
                            {goalsForm.formState.errors.billingCycleDay.message}
                          </p>
                        )}
                        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-1">
                          <p className="text-xs font-medium text-foreground">
                            ⚠️ Atenção ao alterar
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mudar o dia do ciclo afeta como seus gastos são agrupados nos relatórios.
                            Recomendamos usar o dia em que você recebe seu salário.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="propagateEnabled"
                        checked={propagateEnabled}
                        onCheckedChange={(checked) =>
                          goalsForm.setValue("propagateEnabled", checked as boolean)
                        }
                      />
                      <Label htmlFor="propagateEnabled" className="cursor-pointer">
                        Propagar meta para próximos meses
                      </Label>
                    </div>

                    {propagateEnabled && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="propagateMonths">Número de meses (1-12)</Label>
                        <Input
                          id="propagateMonths"
                          type="number"
                          min={1}
                          max={12}
                          {...goalsForm.register("propagateMonths", { valueAsNumber: true })}
                          disabled={upsertMultipleGoals.isPending}
                        />
                        {goalsForm.formState.errors.propagateMonths && (
                          <p className="text-sm text-destructive">
                            {goalsForm.formState.errors.propagateMonths.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          A meta do mês atual será aplicada aos próximos{" "}
                          {goalsForm.watch("propagateMonths") || 0} meses
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      updateProfile.isPending ||
                      upsertMonthlyGoal.isPending ||
                      upsertMultipleGoals.isPending ||
                      !goalsForm.formState.isDirty
                    }
                  >
                    {(updateProfile.isPending ||
                      upsertMonthlyGoal.isPending ||
                      upsertMultipleGoals.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Metas
                  </Button>
                </form>
              </CardContent>
            </Card>
            </div>

            {/* Category Goals Manager */}
            <CategoryGoalsManager />
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
