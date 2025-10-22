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

    // 2. Delete notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    
    if (notifError) console.error("Erro ao deletar notifications:", notifError);

    // 3. Delete expenses
    const { error: expensesError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', user.id);
    
    if (expensesError) console.error("Erro ao deletar expenses:", expensesError);

    // 4. Delete monthly_goals
    const { error: goalsError } = await supabase
      .from('monthly_goals')
      .delete()
      .eq('user_id', user.id);
    
    if (goalsError) console.error("Erro ao deletar monthly_goals:", goalsError);

    // 5. Delete user categories (keep defaults)
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', user.id);
    
    if (categoriesError) console.error("Erro ao deletar categories:", categoriesError);

    // 6. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    
    if (profileError) console.error("Erro ao deletar profile:", profileError);

    // 7. Delete auth user
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

  } catch (error: any) {
    console.error("Erro ao deletar conta:", error);
    return new Response(
      JSON.stringify({ error: error.message, ok: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
