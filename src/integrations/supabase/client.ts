import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// O cabeçalho "automatically generated. Do not edit" saiu junto com a saída da
// plataforma: não há mais sincronização que possa sobrescrever este arquivo.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Antes, variável ausente chegava como undefined em createClient e o app
// quebrava depois, em runtime, com erro opaco de rede. Falhar aqui aponta
// direto para a causa.
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Configuração do Supabase ausente: defina VITE_SUPABASE_URL e ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY no .env (veja o README). ' +
      'Para desenvolvimento local, `npx supabase start` imprime os dois valores.',
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
