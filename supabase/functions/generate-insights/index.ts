import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { AIServiceError, bearerToken, callAIService } from '../_shared/aiService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create service client for token verification
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Properly verify JWT using Supabase auth
    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    
    if (authError || !userData?.user) {
      console.error("❌ Auth verification failed:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = userData.user.id;
    console.log(`✅ User verified. User ID: ${userId}`);

    // Create user-scoped client for RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Calculate current month range
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthStart = `${currentMonth}-01`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextMonthDate.toISOString().slice(0, 10);

    // Previous month for comparison
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.toISOString().slice(0, 7);
    const prevMonthStart = `${prevMonth}-01`;
    const prevMonthEnd = monthStart;

    console.log(`📊 Generating insights for user ${userId}`);

    // Fetch current month expenses
    const { data: currentExpenses } = await supabase
      .from("expenses")
      .select("*, categories:categories!left(*)")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lt("date", nextMonth);

    // Fetch previous month expenses
    const { data: previousExpenses } = await supabase
      .from("expenses")
      .select("*, categories:categories!left(*)")
      .eq("user_id", userId)
      .gte("date", prevMonthStart)
      .lt("date", prevMonthEnd);

    // Fetch monthly goal
    const { data: goal } = await supabase
      .from("monthly_goals")
      .select("total_limit")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle();

    // Fetch category goals
    const { data: categoryGoals } = await supabase
      .from("category_goals")
      .select("*, category:categories(*)")
      .eq("user_id", userId)
      .eq("month", currentMonth);

    // Calculate statistics
    const currentTotal = (currentExpenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
    const previousTotal = (previousExpenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    const categoryTotals = new Map<string, { name: string; total: number; icon: string }>();
    (currentExpenses || []).forEach(exp => {
      const catName = exp.categories?.name || "Outros";
      const catIcon = exp.categories?.icon || "💰";
      if (!categoryTotals.has(catName)) {
        categoryTotals.set(catName, { name: catName, total: 0, icon: catIcon });
      }
      categoryTotals.get(catName)!.total += Number(exp.amount);
    });

    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // Prepare context for AI
    const monthlyGoalValue = goal?.total_limit || 0;
    const goalProgress = monthlyGoalValue > 0 ? (currentTotal / monthlyGoalValue * 100) : 0;
    const monthVariation = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100) : 0;

    const context = {
      currentMonth: currentMonth,
      currentTotal: currentTotal.toFixed(2),
      previousTotal: previousTotal.toFixed(2),
      monthVariation: monthVariation.toFixed(1),
      monthlyGoal: monthlyGoalValue.toFixed(2),
      goalProgress: goalProgress.toFixed(1),
      topCategories: topCategories.map(c => ({
        name: c.name,
        total: c.total.toFixed(2),
        icon: c.icon
      })),
      categoryGoals: (categoryGoals || []).map(cg => ({
        category: cg.category?.name,
        limit: Number(cg.limit_amount).toFixed(2),
        spent: (categoryTotals.get(cg.category?.name || "")?.total || 0).toFixed(2)
      })),
      totalExpenses: currentExpenses?.length || 0
    };

    console.log('📈 Context:', JSON.stringify(context, null, 2));

    // A geração roda no serviço de IA (services/ai). Ele já valida e limita
    // os insights e mantém o fallback determinístico local caso o modelo
    // falhe — o mesmo comportamento que existia aqui, só que testado.
    // O payload vai com números; `context` segue com strings formatadas para
    // não alterar o contrato que o frontend já consome.
    const { insights: generated } = await callAIService<{ insights: unknown[]; fallback: boolean }>(
      '/v1/insights',
      {
        currentMonth,
        currentTotal,
        previousTotal,
        monthVariation: Number(monthVariation.toFixed(1)),
        monthlyGoal: monthlyGoalValue,
        goalProgress: Number(goalProgress.toFixed(1)),
        totalExpenses: currentExpenses?.length || 0,
        topCategories: topCategories.map((c) => ({ name: c.name, total: c.total, icon: c.icon })),
        categoryGoals: (categoryGoals || []).map((cg) => ({
          category: cg.category?.name ?? 'Sem categoria',
          limit: Number(cg.limit_amount),
          spent: categoryTotals.get(cg.category?.name || '')?.total || 0,
        })),
      },
      bearerToken(authHeader),
    );

    const insights = { insights: generated };

    return new Response(
      JSON.stringify({ success: true, ...insights, context }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({ error: error.publicMessage }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
