import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { AIServiceError, bearerToken, callAIService } from '../_shared/aiService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatExpense {
  amount: number;
  merchant?: string | null;
  categories?: { name: string } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { message, conversationId } = await req.json();

    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message format');
    }
    
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error('Message cannot be empty');
    }
    
    if (trimmedMessage.length > 4000) {
      throw new Error('Message too long (max 4000 characters)');
    }

    // Rate limiting check: max 10 messages per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count, error: countError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', oneMinuteAgo);
    
    if (countError) console.error('Rate limit check failed:', countError);
    if (count && count >= 10) {
      throw new Error('Rate limit exceeded. Please wait a minute before sending more messages.');
    }

    // Get user context
    const [profileResult, expensesResult, goalsResult, scoreResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('expenses')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(10),
      supabase.from('monthly_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
        .single(),
      supabase.from('financial_health_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
        .single()
    ]);

    const profile = profileResult.data;
    const expenses: ChatExpense[] = expensesResult.data || [];
    const monthlyGoal = goalsResult.data;
    const healthScore = scoreResult.data;

    // Calculate spending by category
    const categorySpending: Record<string, number> = {};
    let totalSpent = 0;
    
    expenses.forEach((expense) => {
      totalSpent += Number(expense.amount);
      const categoryName = expense.categories?.name || 'Sem categoria';
      categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Number(expense.amount);
    });

    const topCategories = Object.entries(categorySpending)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const monthlyGoalAmount = monthlyGoal?.total_limit || profile?.monthly_goal || 0;
    const percentageUsed = monthlyGoalAmount > 0 
      ? ((totalSpent / monthlyGoalAmount) * 100).toFixed(1) 
      : '0';

    // O prompt é montado dentro do serviço de IA (services/ai), que recebe o
    // contexto estruturado em vez de uma string pronta. Duas mudanças de
    // comportamento, ambas deliberadas:
    //  - o nome real do usuário NÃO é mais enviado ao modelo (antes era
    //    interpolado direto no prompt); vai só para pseudonimização;
    //  - o histórico da conversa passa a ser enviado. Antes as mensagens eram
    //    salvas em chat_messages mas nunca reenviadas, então o assistente não
    //    lembrava do próprio turno anterior.
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationId) {
      const { data: previous } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(10);

      history = (previous ?? [])
        .reverse()
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    }

    const { message: assistantMessage } = await callAIService<{ message: string }>(
      '/v1/chat',
      {
        question: trimmedMessage,
        userName: profile?.name ?? undefined,
        history,
        context: {
          totalSpent,
          monthlyGoal: monthlyGoalAmount,
          percentageUsed: Number(percentageUsed),
          topCategories: topCategories.map((c) => ({
            name: c.name,
            amount: c.amount,
            percentage: Number(c.percentage),
          })),
          healthScore: healthScore
            ? {
                score: healthScore.score,
                budgetAdherence: healthScore.budget_adherence_score,
                quizPerformance: healthScore.quiz_performance_score,
                consistency: healthScore.consistency_score,
                savings: healthScore.savings_score,
              }
            : undefined,
          recentExpenses: expenses.slice(0, 5).map((e) => ({
            merchant: e.merchant ?? null,
            amount: Number(e.amount),
            category: e.categories?.name ?? null,
          })),
        },
      },
      bearerToken(authHeader),
    );

    // Save messages to database
    let finalConversationId = conversationId;
    
    if (!conversationId) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title: trimmedMessage.slice(0, 50) + (trimmedMessage.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (convError) throw convError;
      finalConversationId = newConv.id;
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      conversation_id: finalConversationId,
      user_id: user.id,
      role: 'user',
      content: trimmedMessage
    });

    // Save assistant message
    await supabase.from('chat_messages').insert({
      conversation_id: finalConversationId,
      user_id: user.id,
      role: 'assistant',
      content: assistantMessage
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId: finalConversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-assistant:', error);
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({ error: error.publicMessage }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});