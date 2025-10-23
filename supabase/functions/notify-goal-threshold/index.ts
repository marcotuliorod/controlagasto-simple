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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mês corrente (YYYY-MM)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Verificando alertas de 80% para o mês: ${currentMonth}`);

    // Buscar todas as metas do mês corrente
    const { data: goals, error: goalsError } = await supabase
      .from('monthly_goals')
      .select('user_id, total_limit, month')
      .eq('month', currentMonth);

    if (goalsError) {
      console.error("Erro ao buscar metas:", goalsError);
      throw goalsError;
    }

    if (!goals || goals.length === 0) {
      console.log("Nenhuma meta encontrada para o mês atual");
      return new Response(
        JSON.stringify({ message: "Nenhuma meta para processar", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;

    // Processar cada usuário
    for (const goal of goals) {
      try {
        // Somar despesas do mês usando a função SQL
        const { data: sumData, error: sumError } = await supabase
          .rpc('sum_expenses_in_month', {
            p_user_id: goal.user_id,
            p_month: currentMonth
          });

        if (sumError) {
          console.error(`Erro ao somar despesas do usuário ${goal.user_id}:`, sumError);
          continue;
        }

        const spent = parseFloat(sumData?.[0]?.sum || '0');
        const limit = parseFloat(goal.total_limit);
        const ratio = limit > 0 ? spent / limit : 0;

        console.log(`Usuário ${goal.user_id}: gastou R$ ${spent} de R$ ${limit} (${(ratio * 100).toFixed(1)}%)`);

        // Se atingiu 80% ou mais, criar notificação
        if (ratio >= 0.8) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: goal.user_id,
              type: 'GOAL_80',
              ref_month: currentMonth,
              payload: {
                month: currentMonth,
                limit: limit,
                spent: spent,
                ratio: ratio,
                percentage: Math.round(ratio * 100)
              },
              read: false
            });

          // Ignorar erro de duplicata (constraint violation)
          if (notifError && notifError.code !== '23505') {
            console.error(`Erro ao criar notificação para ${goal.user_id}:`, notifError);
          } else if (!notifError) {
            notificationsCreated++;
            console.log(`✅ Notificação criada para usuário ${goal.user_id}`);
            
            // Enviar push notification
            try {
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userId: goal.user_id,
                  title: '⚠️ Alerta de Meta',
                  body: `Você atingiu ${Math.round(ratio * 100)}% do seu limite mensal (R$ ${spent.toFixed(2)} de R$ ${limit.toFixed(2)})`,
                  url: '/',
                  tag: `goal-threshold-${currentMonth}`,
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  requireInteraction: true,
                }
              });
              console.log(`📱 Push notification enviada para usuário ${goal.user_id}`);
            } catch (pushError) {
              console.error(`Erro ao enviar push para ${goal.user_id}:`, pushError);
            }
          } else {
            console.log(`ℹ️ Notificação já existe para usuário ${goal.user_id}`);
          }
        }
      } catch (userError) {
        console.error(`Erro ao processar usuário ${goal.user_id}:`, userError);
        continue;
      }
    }

    console.log(`Processo concluído. ${notificationsCreated} notificações criadas.`);

    return new Response(
      JSON.stringify({
        message: "Processo concluído",
        month: currentMonth,
        goalsChecked: goals.length,
        notificationsCreated
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
