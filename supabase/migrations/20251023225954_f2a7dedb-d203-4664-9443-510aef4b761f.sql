-- Create table to store VAPID keys
CREATE TABLE IF NOT EXISTS public.vapid_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Only one set of keys should exist
CREATE UNIQUE INDEX vapid_keys_singleton ON public.vapid_keys ((true));

-- RLS policies - only service role can access these keys
ALTER TABLE public.vapid_keys ENABLE ROW LEVEL SECURITY;

-- No user access - only backend functions can read/write
CREATE POLICY "Service role only" ON public.vapid_keys
  FOR ALL
  USING (false);

COMMENT ON TABLE public.vapid_keys IS 'Stores VAPID keys for push notifications - managed automatically by the system';