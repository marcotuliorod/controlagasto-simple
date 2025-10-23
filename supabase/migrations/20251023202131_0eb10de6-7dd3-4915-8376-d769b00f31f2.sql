-- Create educational_content table
CREATE TABLE public.educational_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'orcamento', 'investimento', 'dividas', 'economia', 'planejamento'
  level TEXT NOT NULL, -- 'iniciante', 'intermediario', 'avancado'
  type TEXT NOT NULL, -- 'artigo', 'dica', 'video'
  video_url TEXT,
  reading_time INTEGER, -- em minutos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_progress table to track which content users have completed
CREATE TABLE public.user_content_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.educational_content(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE public.educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for educational_content (public read)
CREATE POLICY "Educational content is viewable by everyone"
  ON public.educational_content
  FOR SELECT
  USING (true);

-- RLS Policies for user_content_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_content_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_content_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_content_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON public.user_content_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on educational_content
CREATE TRIGGER update_educational_content_updated_at
  BEFORE UPDATE ON public.educational_content
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial educational content
INSERT INTO public.educational_content (title, description, content, category, level, type, reading_time) VALUES
('Como Criar um Orçamento Mensal', 'Aprenda os passos básicos para organizar suas finanças pessoais', 'Um orçamento mensal é a base de uma vida financeira saudável. Comece listando todas as suas fontes de renda e, em seguida, categorize seus gastos em essenciais (moradia, alimentação, transporte) e não essenciais (lazer, assinaturas). Use a regra 50-30-20: 50% para necessidades, 30% para desejos e 20% para poupança. Acompanhe seus gastos semanalmente e ajuste conforme necessário.', 'orcamento', 'iniciante', 'artigo', 5),
('A Regra dos 50-30-20', 'Método simples para dividir sua renda de forma equilibrada', 'A regra 50-30-20 é uma estratégia popular de orçamento que divide sua renda após impostos em três categorias: 50% para necessidades essenciais (aluguel, alimentação, contas), 30% para desejos pessoais (lazer, hobbies, entretenimento) e 20% para objetivos financeiros (poupança, investimentos, quitação de dívidas). Esta abordagem oferece um equilíbrio entre viver o presente e planejar o futuro.', 'orcamento', 'iniciante', 'artigo', 4),
('Eliminando Pequenos Gastos', 'Dicas práticas para reduzir despesas do dia a dia', 'Pequenos gastos diários podem somar uma grande quantia ao final do mês. Prepare seu café em casa ao invés de comprar todos os dias. Leve marmita para o trabalho. Cancele assinaturas que você não usa. Compare preços antes de comprar. Use aplicativos de cashback. Evite compras por impulso esperando 24 horas antes de decidir. Cada economia de R$ 10 por dia resulta em R$ 300 por mês!', 'economia', 'iniciante', 'dica', 3),
('Fundo de Emergência: Por Que e Como', 'A importância de ter uma reserva financeira para imprevistos', 'Um fundo de emergência é essencial para lidar com despesas inesperadas sem comprometer seu orçamento ou contrair dívidas. O ideal é acumular de 3 a 6 meses de suas despesas mensais. Comece pequeno: guarde 10% de sua renda mensalmente. Mantenha o dinheiro em aplicações de liquidez imediata como poupança ou CDB com liquidez diária. Use apenas para verdadeiras emergências: desemprego, saúde, consertos urgentes.', 'planejamento', 'intermediario', 'artigo', 6),
('Como Sair das Dívidas', 'Estratégias eficazes para quitar débitos e recuperar sua saúde financeira', 'Para sair das dívidas, primeiro liste todos os débitos com valores, taxas de juros e datas de vencimento. Use o método bola de neve: quite primeiro as menores dívidas para ganhar momentum psicológico. Ou o método avalanche: priorize as dívidas com maiores juros. Negocie com credores para reduzir juros e parcelar. Corte gastos supérfluos temporariamente. Considere renda extra. Evite novas dívidas a todo custo. Celebre cada dívida quitada!', 'dividas', 'intermediario', 'artigo', 7),
('Investimentos para Iniciantes', 'Primeiros passos no mundo dos investimentos', 'Investir não é apenas para ricos. Comece com o básico: Tesouro Direto oferece títulos seguros desde R$ 30. CDBs de bancos sólidos rendem mais que poupança. Fundos de investimento permitem diversificação com pouco capital. Antes de investir: tenha um fundo de emergência, quite dívidas caras (cartão de crédito, cheque especial), estude o básico sobre risco e rentabilidade. Diversifique seus investimentos e pense no longo prazo.', 'investimento', 'iniciante', 'artigo', 8),
('Planejando Objetivos Financeiros', 'Como transformar sonhos em metas alcançáveis', 'Objetivos financeiros bem definidos motivam você a economizar. Use o método SMART: Específico (casa própria), Mensurável (R$ 50.000 de entrada), Atingível (economizando R$ 1.000/mês), Relevante (prioridade familiar), Temporal (em 4 anos). Divida objetivos em curto (até 1 ano), médio (1-5 anos) e longo prazo (5+ anos). Abra contas separadas para cada objetivo. Automatize transferências mensais. Revise e ajuste trimestralmente.', 'planejamento', 'intermediario', 'artigo', 6),
('Psicologia do Dinheiro', 'Entenda seus gatilhos emocionais de compra', 'Nossas emoções influenciam fortemente decisões financeiras. Identifique seus gatilhos: compra por estresse, tédio, comparação social? Pratique o consumo consciente: pergunte-se "preciso ou quero?". Implemente a regra das 24 horas para compras não planejadas. Evite shopping em momentos emocionais. Celebre conquistas de forma gratuita ou barata. Reconheça que felicidade não vem de posses materiais. Dinheiro é ferramenta, não objetivo final.', 'planejamento', 'avancado', 'artigo', 9)