import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente financeiro educativo e amigável. Analise os dados do usuário e forneça 3-4 insights concisos e acionáveis sobre seus gastos. 

Diretrizes:
- Use linguagem clara e empática
- Destaque padrões positivos e áreas de atenção
- Sugira ações práticas quando relevante
- Seja objetivo (máximo 2 frases por insight)
- Use emojis apropriados (✅, ⚠️, 💡, 📊, 🎯, etc.)

Formato de resposta (JSON):
{
  "insights": [
    { "type": "positive|warning|tip", "message": "..." },
    { "type": "positive|warning|tip", "message": "..." }
  ]
}`
          },
          {
            role: 'user',
            content: `Analise estes dados financeiros de ${context.currentMonth}:

Gastos: R$ ${context.currentTotal} este mês (R$ ${context.previousTotal} no mês anterior = ${context.monthVariation}% de variação)
Meta mensal: R$ ${context.monthlyGoal} (${context.goalProgress}% atingido)
Total de transações: ${context.totalExpenses}

Top 3 categorias:
${context.topCategories.map(c => `- ${c.icon} ${c.name}: R$ ${c.total}`).join('\n')}

Metas por categoria:
${context.categoryGoals.map(cg => `- ${cg.category}: R$ ${cg.spent} / R$ ${cg.limit}`).join('\n') || 'Nenhuma meta definida'}

Gere insights personalizados em português do Brasil.`
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API Error:', errorText);
      throw new Error('Failed to generate insights');
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;

    console.log('🤖 AI Response:', aiMessage);

    // Parse AI response
    let insights;
    try {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response, using fallback');
      insights = {
        insights: [
          {
            type: 'tip',
            message: `💡 Você gastou R$ ${context.currentTotal} este mês. ${monthVariation > 0 ? 'Aumento de ' + Math.abs(monthVariation).toFixed(0) + '% em relação ao mês anterior.' : 'Redução de ' + Math.abs(monthVariation).toFixed(0) + '% em relação ao mês anterior.'}`
          }
        ]
      };
    }

    return new Response(
      JSON.stringify({ success: true, ...insights, context }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
