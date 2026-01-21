import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { period } = await req.json();
    const { from, to } = period;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Extract token from "Bearer <token>"
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = userData.user.id;
    console.log(`✅ User verified. User ID: ${userId}`);
    
    // Create user-scoped client for RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { 
        headers: { Authorization: authHeader }
      },
      auth: {
        persistSession: false,
      }
    });

    // Calcular endExclusive (alinhar com UI: inclusivo-exclusivo)
    let endExclusive = null;
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      endExclusive = toDate.toISOString().slice(0, 10);
    }

    console.log(`📦 Export: Buscando despesas de ${from} até ${endExclusive || 'hoje'} (exclusivo)`);

    // LEFT JOIN para não perder despesas sem categoria, sem limites
    let query = supabase
      .from("expenses")
      .select("*, categories:categories!left(*)")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (from) query = query.gte("date", from);
    if (endExclusive) query = query.lt("date", endExclusive);

    const { data: expenses, error } = await query;
    if (error) throw error;

    console.log(`✅ Export: ${expenses?.length || 0} despesas encontradas`);

    // Get profile for additional context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Prepare data for export
    const exportData = {
      user: {
        email: profile?.name || "User",
        name: profile?.name,
        monthly_goal: profile?.monthly_goal,
      },
      period: { from, to },
      expenses: expenses.map(exp => ({
        date: exp.date,
        amount: exp.amount,
        category: exp.categories?.name,
        merchant: exp.merchant,
        payment_method: exp.payment_method,
        notes: exp.notes,
      })),
      summary: {
        total_expenses: expenses.length,
        total_amount: expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
      },
    };

    // Generate CSV
    const csvHeader = "Data,Valor,Categoria,Estabelecimento,Forma de Pagamento,Observações\n";
    const csvRows = expenses.map(exp =>
      `${exp.date},${exp.amount},${exp.categories?.name || ""},${exp.merchant || ""},${exp.payment_method || ""},${exp.notes || ""}`
    ).join("\n");
    const csv = csvHeader + csvRows;

    // Generate JSON
    const json = JSON.stringify(exportData, null, 2);

    return new Response(
      JSON.stringify({
        csv,
        json,
        summary: exportData.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro ao exportar dados:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
