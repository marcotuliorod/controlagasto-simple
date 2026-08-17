import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AIServiceError, bearerToken, callAIService } from "../_shared/aiService.ts";

interface ReceiptData {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  cnpj: string | null;
  items: Array<{ name: string; value: number | null }>;
  receipt_path?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error("Imagem não fornecida");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Erro na verificação do token:", userError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Iniciando processamento de cupom fiscal...");

    // A extração roda no serviço de IA (services/ai), que é quem conhece o
    // fornecedor. Ele já devolve os campos normalizados — valor como número e
    // data em ISO — então o tratamento manual que existia aqui saiu junto com
    // o parsing de markdown.
    const extractedData = await callAIService<ReceiptData>(
      "/v1/receipt",
      { mimeType: "image/jpeg", data: imageBase64 },
      bearerToken(authHeader),
    );

    console.log("Dados extraídos:", extractedData);

    // Upload image to storage (privado) — user is already verified above
    try {
      // Convert base64 to blob
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('receipts')
        .upload(fileName, binaryData, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (!uploadError && uploadData) {
        // Retornar apenas o path (não URL pública)
        extractedData.receipt_path = fileName;
        console.log("Imagem salva no storage (privado):", fileName);
      }
    } catch (storageError) {
      console.error("Erro ao salvar imagem:", storageError);
      // Continue even if storage fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Erro no processamento:", error);

    // O serviço de IA já classifica o erro (429, 503, 504...) e traz uma
    // mensagem neutra. Antes isto virava 500 genérico, e no caso de cota
    // esgotada chegava a expor "Créditos Lovable AI esgotados. Adicione
    // créditos em Settings -> Workspace -> Usage." para o usuário final.
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({ error: error.publicMessage, success: false }),
        { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao processar cupom";
    return new Response(
      JSON.stringify({
        error: message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
