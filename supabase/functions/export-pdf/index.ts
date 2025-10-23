import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { startDate, endDate } = await req.json();
    console.log('Generating PDF for user:', user.id, 'from', startDate, 'to', endDate);

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false });

    if (expensesError) throw expensesError;

    // Calculate statistics
    const total = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    const count = expenses?.length || 0;
    const average = count > 0 ? total / count : 0;

    // Group by category
    const categoryTotals: Record<string, { total: number; count: number; name: string; color: string }> = {};
    expenses?.forEach(exp => {
      const catId = exp.category_id || 'uncategorized';
      const catName = exp.categories?.name || 'Sem categoria';
      const catColor = exp.categories?.color || '#6b7280';
      
      if (!categoryTotals[catId]) {
        categoryTotals[catId] = { total: 0, count: 0, name: catName, color: catColor };
      }
      categoryTotals[catId].total += Number(exp.amount);
      categoryTotals[catId].count += 1;
    });

    const categoryData = Object.entries(categoryTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #10b981; font-size: 32px; margin-bottom: 10px; }
    .subtitle { color: #6b7280; font-size: 14px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 8px; }
    .summary-card h3 { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .summary-card .value { color: #1f2937; font-size: 24px; font-weight: bold; }
    .section { margin: 40px 0; }
    .section h2 { color: #1f2937; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; text-align: left; padding: 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .category-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .amount { font-weight: 600; color: #1f2937; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Gastos</h1>
    <p class="subtitle">Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(new Date(endDate).getTime() - 86400000).toLocaleDateString('pt-BR')}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Total de Gastos</h3>
      <div class="value">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card">
      <h3>Quantidade</h3>
      <div class="value">${count}</div>
    </div>
    <div class="summary-card">
      <h3>Média por Gasto</h3>
      <div class="value">R$ ${average.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  </div>

  <div class="section">
    <h2>Gastos por Categoria</h2>
    <table>
      <thead>
        <tr>
          <th>Categoria</th>
          <th>Quantidade</th>
          <th>Total</th>
          <th>% do Total</th>
        </tr>
      </thead>
      <tbody>
        ${categoryData.map(cat => `
          <tr>
            <td>
              <span class="category-badge" style="background-color: ${cat.color}20; color: ${cat.color};">
                ${cat.name}
              </span>
            </td>
            <td>${cat.count}</td>
            <td class="amount">R$ ${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${((cat.total / total) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Detalhamento de Gastos</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Categoria</th>
          <th>Estabelecimento</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${expenses?.slice(0, 50).map(exp => `
          <tr>
            <td>${new Date(exp.date).toLocaleDateString('pt-BR')}</td>
            <td>
              <span class="category-badge" style="background-color: ${exp.categories?.color || '#6b7280'}20; color: ${exp.categories?.color || '#6b7280'};">
                ${exp.categories?.name || 'Sem categoria'}
              </span>
            </td>
            <td>${exp.merchant || '-'}</td>
            <td class="amount">R$ ${Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
        ${(expenses?.length || 0) > 50 ? `
          <tr>
            <td colspan="4" style="text-align: center; color: #6b7280; font-style: italic;">
              ... e mais ${(expenses?.length || 0) - 50} gastos
            </td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    <p>Entenda Seus Gastos - Educação Financeira Pessoal</p>
  </div>
</body>
</html>
    `;

    // Return HTML that can be converted to PDF on client side
    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        summary: {
          total,
          count,
          average,
          categoryData
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});