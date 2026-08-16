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
    const { confirm } = await req.json();

    if (confirm !== "EXCLUIR") {
      return new Response(
        JSON.stringify({ error: "Confirmação inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Iniciando exclusão da conta do usuário: ${user.id}`);

    // 1. Delete receipts from storage
    const { data: files } = await supabase.storage
      .from('receipts')
      .list(`${user.id}`);

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${user.id}/${file.name}`);
      await supabase.storage.from('receipts').remove(filePaths);
      console.log(`${files.length} arquivo(s) deletado(s) do storage`);
    }

    // 2. Delete chat_messages (before chat_conversations)
    const { error: chatMsgError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);
    if (chatMsgError) console.error("Erro ao deletar chat_messages:", chatMsgError);

    // 3. Delete chat_conversations
    const { error: chatConvError } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('user_id', user.id);
    if (chatConvError) console.error("Erro ao deletar chat_conversations:", chatConvError);

    // 4. Delete quiz_responses
    const { error: quizError } = await supabase
      .from('quiz_responses')
      .delete()
      .eq('user_id', user.id);
    if (quizError) console.error("Erro ao deletar quiz_responses:", quizError);

    // 5. Delete user_content_progress
    const { error: progressError } = await supabase
      .from('user_content_progress')
      .delete()
      .eq('user_id', user.id);
    if (progressError) console.error("Erro ao deletar user_content_progress:", progressError);

    // 6. Delete financial_health_scores
    const { error: healthError } = await supabase
      .from('financial_health_scores')
      .delete()
      .eq('user_id', user.id);
    if (healthError) console.error("Erro ao deletar financial_health_scores:", healthError);

    // 7. Delete category_goals (before categories)
    const { error: catGoalsError } = await supabase
      .from('category_goals')
      .delete()
      .eq('user_id', user.id);
    if (catGoalsError) console.error("Erro ao deletar category_goals:", catGoalsError);

    // 8. Delete recurring_expenses (before accounts/categories)
    const { error: recurringError } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('user_id', user.id);
    if (recurringError) console.error("Erro ao deletar recurring_expenses:", recurringError);

    // 9. Delete notification_preferences
    const { error: notifPrefError } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', user.id);
    if (notifPrefError) console.error("Erro ao deletar notification_preferences:", notifPrefError);

    // 10. Delete push_subscriptions
    const { error: pushError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);
    if (pushError) console.error("Erro ao deletar push_subscriptions:", pushError);

    // 11. Delete saved_filters
    const { error: filtersError } = await supabase
      .from('saved_filters')
      .delete()
      .eq('user_id', user.id);
    if (filtersError) console.error("Erro ao deletar saved_filters:", filtersError);

    // 12. Delete scheduled_exports
    const { error: exportsError } = await supabase
      .from('scheduled_exports')
      .delete()
      .eq('user_id', user.id);
    if (exportsError) console.error("Erro ao deletar scheduled_exports:", exportsError);

    // 13. Delete notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    if (notifError) console.error("Erro ao deletar notifications:", notifError);

    // 14. Delete expenses (before accounts)
    const { error: expensesError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', user.id);
    if (expensesError) console.error("Erro ao deletar expenses:", expensesError);

    // 15. Delete monthly_goals
    const { error: goalsError } = await supabase
      .from('monthly_goals')
      .delete()
      .eq('user_id', user.id);
    if (goalsError) console.error("Erro ao deletar monthly_goals:", goalsError);

    // 16. Delete accounts (after expenses)
    const { error: accountsError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', user.id);
    if (accountsError) console.error("Erro ao deletar accounts:", accountsError);

    // 17. Delete user categories (after expenses/category_goals)
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', user.id);
    if (categoriesError) console.error("Erro ao deletar categories:", categoriesError);

    // 18. Delete audit_logs (before auth user)
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('user_id', user.id);
    if (auditError) console.error("Erro ao deletar audit_logs:", auditError);

    // 19. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profileError) console.error("Erro ao deletar profile:", profileError);

    // 20. Delete auth user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error("Erro ao deletar usuário do Auth:", deleteUserError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao excluir usuário do sistema de autenticação",
          ok: false 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Conta do usuário ${user.id} excluída com sucesso`);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Erro ao deletar conta:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message, ok: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
