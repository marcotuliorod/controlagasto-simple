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

    console.log('Checking category variations for user:', user.id);

    // Get current and previous month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const previousMonthEnd = currentMonthStart;

    // Fetch current month expenses
    const { data: currentExpenses, error: currentError } = await supabase
      .from('expenses')
      .select('amount, category_id, categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', currentMonthStart)
      .lt('date', currentMonthEnd);

    if (currentError) throw currentError;

    // Fetch previous month expenses
    const { data: previousExpenses, error: previousError } = await supabase
      .from('expenses')
      .select('amount, category_id, categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', previousMonthStart)
      .lt('date', previousMonthEnd);

    if (previousError) throw previousError;

    // Calculate totals by category
    const calculateCategoryTotals = (expenses: any[]) => {
      const totals: Record<string, { total: number; name: string; color: string }> = {};
      expenses?.forEach(exp => {
        const catId = exp.category_id || 'uncategorized';
        if (!totals[catId]) {
          totals[catId] = {
            total: 0,
            name: exp.categories?.name || 'Sem categoria',
            color: exp.categories?.color || '#6b7280'
          };
        }
        totals[catId].total += Number(exp.amount);
      });
      return totals;
    };

    const currentTotals = calculateCategoryTotals(currentExpenses || []);
    const previousTotals = calculateCategoryTotals(previousExpenses || []);

    // Find significant variations (>20%)
    const alerts = [];
    const allCategories = new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)]);

    for (const catId of allCategories) {
      const current = currentTotals[catId]?.total || 0;
      const previous = previousTotals[catId]?.total || 0;

      if (previous === 0 && current > 0) {
        // New category spending
        alerts.push({
          type: 'new_category',
          category_id: catId,
          category_name: currentTotals[catId].name,
          current_amount: current,
          variation_percent: 100
        });
      } else if (previous > 0) {
        const variation = ((current - previous) / previous) * 100;
        
        if (Math.abs(variation) >= 20) {
          alerts.push({
            type: variation > 0 ? 'increase' : 'decrease',
            category_id: catId,
            category_name: currentTotals[catId]?.name || previousTotals[catId].name,
            current_amount: current,
            previous_amount: previous,
            variation_percent: variation
          });
        }
      }
    }

    // Create notifications for significant alerts
    const notifications = alerts.map(alert => ({
      user_id: user.id,
      type: 'category_variation',
      payload: alert,
      ref_month: now.toISOString().slice(0, 7),
      created_at: new Date().toISOString()
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    console.log(`Created ${notifications.length} variation alerts for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_created: notifications.length,
        alerts 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error checking category variations:', error);
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