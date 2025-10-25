import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedRequest {
  count?: number;
}

const merchants = [
  'Supermercado Extra', 'Posto Ipiranga', 'Restaurante Lá da Venda', 
  'Farmácia Drogasil', 'Padaria Pão Quente', 'Uber', 'iFood',
  'Magazine Luiza', 'Americanas', 'Netflix', 'Amazon Prime',
  'Spotify', 'Mercado Livre', 'Zara', 'Renner', 'Nike Store',
  'Starbucks', 'McDonald\'s', 'Outback', 'Cinema Cinemark'
];

const paymentMethods = ['Dinheiro', 'Débito', 'Crédito', 'PIX'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count = 30 }: SeedRequest = await req.json();

    // Fetch user's categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .limit(10);

    if (catError || !categories || categories.length === 0) {
      console.error('Category error:', catError);
      return new Response(
        JSON.stringify({ error: 'Nenhuma categoria encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(5);

    // Generate expenses for last 90 days
    const expenses = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 90);

    for (let i = 0; i < count; i++) {
      // Random date in last 90 days
      const randomTime = startDate.getTime() + Math.random() * (today.getTime() - startDate.getTime());
      const randomDate = new Date(randomTime);
      const dateStr = randomDate.toISOString().split('T')[0];

      // Random amount between 10 and 500
      const amount = (Math.random() * 490 + 10).toFixed(2);

      // Random category
      const categoryId = categories[Math.floor(Math.random() * categories.length)].id;

      // Random account (if available)
      const accountId = accounts && accounts.length > 0 
        ? accounts[Math.floor(Math.random() * accounts.length)].id 
        : null;

      // Random merchant
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];

      // Random payment method
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      expenses.push({
        user_id: user.id,
        amount: parseFloat(amount),
        date: dateStr,
        category_id: categoryId,
        account_id: accountId,
        merchant,
        payment_method: paymentMethod,
        source: 'seed',
        notes: 'Despesa gerada automaticamente para teste',
      });
    }

    // Insert expenses in batch
    const { data: insertedExpenses, error: insertError } = await supabase
      .from('expenses')
      .insert(expenses)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir despesas: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully seeded ${insertedExpenses?.length} expenses for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedExpenses?.length || 0,
        message: `${insertedExpenses?.length} despesas criadas com sucesso!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-expenses:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
