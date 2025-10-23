-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
ON public.chat_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.chat_conversations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.chat_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at on chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();