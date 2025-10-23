-- Tabela de metas por categoria
CREATE TABLE category_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month text NOT NULL,
  limit_amount numeric NOT NULL CHECK (limit_amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id, month)
);

-- Índices para performance
CREATE INDEX idx_category_goals_user_month ON category_goals(user_id, month);
CREATE INDEX idx_category_goals_category ON category_goals(category_id);

-- RLS Policies
ALTER TABLE category_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own category goals"
  ON category_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category goals"
  ON category_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category goals"
  ON category_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category goals"
  ON category_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_category_goals_updated_at
  BEFORE UPDATE ON category_goals
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();