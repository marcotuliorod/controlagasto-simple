-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of answer options
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'facil', 'medio', 'dificil'
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_responses table
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_questions
CREATE POLICY "Quiz questions are viewable by everyone"
ON public.quiz_questions
FOR SELECT
USING (true);

-- RLS Policies for quiz_responses
CREATE POLICY "Users can view their own responses"
ON public.quiz_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses"
ON public.quiz_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
ON public.quiz_responses
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert sample quiz questions
INSERT INTO public.quiz_questions (question, options, correct_answer, explanation, category, difficulty, points) VALUES
('O que é orçamento pessoal?', 
 '["Um documento que registra apenas despesas", "Um plano que equilibra receitas e despesas", "Uma lista de desejos de compra", "Um relatório bancário mensal"]'::jsonb,
 'Um plano que equilibra receitas e despesas',
 'Orçamento pessoal é uma ferramenta essencial de planejamento financeiro que ajuda a controlar entradas e saídas de dinheiro, permitindo tomar decisões conscientes sobre gastos e investimentos.',
 'orcamento',
 'facil',
 10),

('Qual a recomendação ideal para reserva de emergência?',
 '["1 mês de despesas", "3 a 6 meses de despesas", "1 ano de despesas", "Não é necessário ter reserva"]'::jsonb,
 '3 a 6 meses de despesas',
 'Especialistas recomendam ter uma reserva de emergência equivalente a 3-6 meses de despesas fixas. Isso proporciona segurança financeira em casos de imprevistos como perda de emprego ou emergências médicas.',
 'planejamento',
 'medio',
 15),

('O que significa taxa SELIC?',
 '["Taxa de juros do cartão de crédito", "Taxa básica de juros da economia brasileira", "Taxa de inflação oficial", "Taxa de câmbio do dólar"]'::jsonb,
 'Taxa básica de juros da economia brasileira',
 'A SELIC (Sistema Especial de Liquidação e Custódia) é a taxa básica de juros da economia brasileira, definida pelo Banco Central. Ela influencia todas as outras taxas de juros do país.',
 'investimentos',
 'medio',
 15),

('Qual a diferença entre juros simples e compostos?',
 '["Não há diferença prática", "Juros simples incidem sobre o valor inicial, compostos sobre o montante acumulado", "Juros compostos são sempre menores", "Juros simples são ilegais no Brasil"]'::jsonb,
 'Juros simples incidem sobre o valor inicial, compostos sobre o montante acumulado',
 'Juros simples calculam-se sempre sobre o valor inicial, enquanto juros compostos incidem sobre o montante acumulado (capital + juros). Os juros compostos geram crescimento exponencial, sendo chamados de "juros sobre juros".',
 'economia',
 'dificil',
 20),

('O que caracteriza um ativo?',
 '["Algo que gera despesas mensais", "Algo que coloca dinheiro no seu bolso", "Qualquer bem material", "Apenas imóveis e carros"]'::jsonb,
 'Algo que coloca dinheiro no seu bolso',
 'Um ativo é algo que gera renda ou valoriza com o tempo, colocando dinheiro no seu bolso. Exemplos: investimentos, imóveis alugados, negócios. Já um passivo tira dinheiro do seu bolso através de despesas.',
 'investimentos',
 'medio',
 15),

('Qual a ordem correta para organizar finanças pessoais?',
 '["Investir, Poupar, Gastar", "Gastar, Poupar, Investir", "Poupar, Gastar, Investir", "Gastar, Investir, Poupar"]'::jsonb,
 'Poupar, Gastar, Investir',
 'A ordem ideal é: primeiro separar uma parte para poupança/investimentos (pague-se primeiro), depois cobrir despesas essenciais, e por último gastos variáveis. Isso garante que você sempre estará construindo patrimônio.',
 'planejamento',
 'facil',
 10),

('O que é diversificação de investimentos?',
 '["Investir todo dinheiro em diferentes bancos", "Distribuir investimentos em diferentes tipos de ativos", "Investir apenas em ações", "Manter todo dinheiro na poupança"]'::jsonb,
 'Distribuir investimentos em diferentes tipos de ativos',
 'Diversificação significa não colocar "todos os ovos na mesma cesta". É distribuir seus investimentos entre diferentes tipos de ativos (ações, renda fixa, fundos imobiliários) para reduzir riscos.',
 'investimentos',
 'medio',
 15),

('Qual a principal função do score de crédito?',
 '["Definir seu salário", "Avaliar sua probabilidade de pagar dívidas", "Calcular impostos devidos", "Determinar sua idade de aposentadoria"]'::jsonb,
 'Avaliar sua probabilidade de pagar dívidas',
 'O score de crédito é uma pontuação que indica ao mercado qual a probabilidade de você pagar suas contas em dia. Quanto maior o score, melhores as condições de crédito oferecidas.',
 'credito',
 'facil',
 10);

-- Create index for better performance
CREATE INDEX idx_quiz_responses_user_id ON public.quiz_responses(user_id);
CREATE INDEX idx_quiz_responses_question_id ON public.quiz_responses(question_id);