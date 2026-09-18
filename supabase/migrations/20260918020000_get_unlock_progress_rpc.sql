-- Consolida as 6 leituras paralelas de useUnlockProgress() numa única RPC.
--
-- src/hooks/useGamification.ts fazia Promise.all com 6 round-trips HTTP
-- separados (progresso educacional, conteúdo educacional, respostas de quiz,
-- perguntas de quiz, contagem de despesas, datas de despesas dos últimos 30
-- dias). O Promise.all já eliminou a espera sequencial (PERF-02, ver
-- docs/STATE.md), mas continuavam sendo 6 requisições em vez de 1.
--
-- Usa auth.uid() internamente em vez de receber p_user_id por parâmetro
-- (diferente de get_billing_period/calculate_financial_health_score, que
-- recebem o id do usuário como argumento): como quem chama é sempre o
-- próprio usuário lendo o próprio progresso, não há motivo para confiar num
-- id vindo do cliente — auth.uid() elimina essa superfície por completo.
CREATE OR REPLACE FUNCTION public.get_unlock_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_education_by_category jsonb;
  v_quiz_by_category jsonb;
  v_total_education_completed integer;
  v_total_quiz_responses integer;
  v_expense_count integer;
  v_days_active integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Progresso educacional concluído, agrupado por categoria do conteúdo.
  SELECT jsonb_object_agg(sub.category, sub.cnt)
  INTO v_education_by_category
  FROM (
    SELECT ec.category, count(*) AS cnt
    FROM user_content_progress ucp
    JOIN educational_content ec ON ec.id = ucp.content_id
    WHERE ucp.user_id = v_user_id AND ucp.completed = true
    GROUP BY ec.category
  ) sub;

  SELECT count(*) INTO v_total_education_completed
  FROM user_content_progress
  WHERE user_id = v_user_id AND completed = true;

  -- Respostas de quiz, agrupadas por categoria da pergunta (acertos/total).
  SELECT jsonb_object_agg(
    sub.category,
    jsonb_build_object('correct', sub.correct, 'total', sub.total)
  )
  INTO v_quiz_by_category
  FROM (
    SELECT
      qq.category,
      count(*) FILTER (WHERE qr.is_correct) AS correct,
      count(*) AS total
    FROM quiz_responses qr
    JOIN quiz_questions qq ON qq.id = qr.question_id
    WHERE qr.user_id = v_user_id
    GROUP BY qq.category
  ) sub;

  SELECT count(*) INTO v_total_quiz_responses
  FROM quiz_responses
  WHERE user_id = v_user_id;

  -- Contagem de despesas — sem filtro de is_transfer, igual ao hook original.
  SELECT count(*) INTO v_expense_count
  FROM expenses
  WHERE user_id = v_user_id;

  -- Dias com despesa nos últimos 30 dias (datas únicas).
  SELECT count(DISTINCT date) INTO v_days_active
  FROM expenses
  WHERE user_id = v_user_id
    AND date >= (CURRENT_DATE - INTERVAL '30 days');

  RETURN jsonb_build_object(
    'educationByCategory', COALESCE(v_education_by_category, '{}'::jsonb),
    'quizScoresByCategory', COALESCE(v_quiz_by_category, '{}'::jsonb),
    'totalEducationCompleted', v_total_education_completed,
    'totalQuizResponses', v_total_quiz_responses,
    'expenseCount', v_expense_count,
    'daysActive', v_days_active
  );
END;
$$;

COMMENT ON FUNCTION public.get_unlock_progress() IS
'Consolida numa única chamada os dados de progresso de gamificação (educação, quiz, despesas) do usuário autenticado (auth.uid()), usados por useUnlockProgress() para decidir o que já está desbloqueado.';

-- Sem GRANT explícito: ALTER DEFAULT PRIVILEGES em
-- 20260816140000_grants_schema_publico.sql já cobre EXECUTE em toda routine
-- nova do schema public para anon/authenticated/service_role.
