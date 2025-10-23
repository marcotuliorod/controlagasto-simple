-- Migration v5.1.0b: Fix Search Path for All Functions
-- This migration ensures all custom functions have fixed search_path

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, monthly_goal)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 0);
  RETURN NEW;
END;
$function$;

-- Fix handle_updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user IS 
'Trigger function que cria automaticamente um perfil quando um novo usuário se registra. 
SECURITY DEFINER com search_path fixo.';

COMMENT ON FUNCTION public.handle_updated_at IS 
'Trigger function que atualiza automaticamente o campo updated_at. 
Search_path fixo para prevenir vulnerabilidades.';