import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

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

    // Build context for AI
    const userContext = `
Contexto do usuário ${profile?.name || 'Usuário'}:

GASTOS DO MÊS ATUAL:
- Total gasto: R$ ${totalSpent.toFixed(2)}
- Meta mensal: R$ ${monthlyGoalAmount.toFixed(2)}
- Percentual usado: ${percentageUsed}%
${topCategories.length > 0 ? `
- Top 3 categorias:
${topCategories.map(c => `  • ${c.name}: R$ ${c.amount.toFixed(2)} (${c.percentage}%)`).join('\n')}
` : ''}

${healthScore ? `SCORE DE SAÚDE FINANCEIRA:
- Score total: ${healthScore.score}/100
- Aderência ao orçamento: ${healthScore.budget_adherence_score}/40
- Performance no quiz: ${healthScore.quiz_performance_score}/20
- Consistência: ${healthScore.consistency_score}/20
- Economia: ${healthScore.savings_score}/20
` : ''}

${expenses.length > 0 ? `ÚLTIMAS DESPESAS:
${expenses.slice(0, 5).map((e) =>
  `- ${e.merchant || 'Despesa'}: R$ ${Number(e.amount).toFixed(2)} (${e.categories?.name || 'Sem categoria'})`
).join('\n')}` : 'Nenhuma despesa registrada este mês.'}
`;

    const systemPrompt = `Você é um assistente financeiro pessoal brasileiro, especializado em educação financeira.

${userContext}

Seu objetivo é:
1. Responder perguntas sobre educação financeira de forma clara, didática e em português brasileiro
2. Analisar os gastos do usuário e oferecer insights personalizados baseados nos dados reais
3. Sugerir ações práticas e específicas baseadas no comportamento financeiro do usuário
4. Ser empático, positivo e motivador, celebrando conquistas e encorajando melhorias
5. Usar linguagem simples, acessível e brasileira

Diretrizes importantes:
- Use os dados reais do usuário para contextualizar todas as suas respostas
- Seja específico e prático nas recomendações
- Evite jargões financeiros complexos
- Sempre que relevante, mencione o score de saúde financeira e como melhorá-lo
- Sugira funcionalidades do app quando apropriado (simuladores, conteúdo educacional, quiz)
- Mantenha respostas concisas mas completas (máximo 3-4 parágrafos)`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: trimmedMessage }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

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