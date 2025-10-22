import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function RequireOnboarding() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Verificar se existe meta para o mês corrente
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const { data: monthlyGoal } = await supabase
        .from("monthly_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .single();

      // Se não tem meta do mês corrente, precisa fazer onboarding
      setNeedsOnboarding(!monthlyGoal);
    } catch (error) {
      console.error("Erro ao verificar status de onboarding:", error);
      setNeedsOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não precisa de onboarding, redireciona para dashboard
  if (!needsOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se precisa de onboarding, permite acesso à rota
  return <Outlet />;
}
