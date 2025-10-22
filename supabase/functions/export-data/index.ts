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
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não encontrado");

    console.log(`Exportando dados do usuário ${user.id} de ${from} a ${to}`);

    // Get expenses with categories
    let query = supabase
      .from("expenses")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data: expenses, error } = await query;
    if (error) throw error;

    // Get profile for additional context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Prepare data for export
    const exportData = {
      user: {
        email: user.email,
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
        total_amount: expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
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
