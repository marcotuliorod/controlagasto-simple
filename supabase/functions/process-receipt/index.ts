import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    console.log("Iniciando processamento de cupom fiscal...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Chamar Lovable AI com a imagem
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extrair informações de cupons fiscais brasileiros. 
Analise a imagem do cupom e extraia as seguintes informações em formato JSON:
{
  "amount": número total da compra (apenas o número, sem R$),
  "date": data no formato YYYY-MM-DD,
  "merchant": nome do estabelecimento,
  "cnpj": CNPJ do estabelecimento (se disponível),
  "items": array com até 3 itens principais comprados (nome e valor)
}

Se alguma informação não estiver clara ou visível, retorne null para esse campo.
Retorne APENAS o JSON, sem explicações adicionais.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia as informações deste cupom fiscal:"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos Lovable AI esgotados. Adicione créditos em Settings -> Workspace -> Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta da API:", JSON.stringify(data));

    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("Resposta da AI vazia");
    }

    // Extrair JSON da resposta (remover markdown se houver)
    let jsonStr = aiResponse.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```\n?/g, "");
    }

    let extractedData = JSON.parse(jsonStr);
    console.log("Dados extraídos:", extractedData);

    // Normalize amount - remove R$ and convert comma to dot
    if (extractedData.amount) {
      let amountStr = String(extractedData.amount).replace(/[R$\s]/g, '').replace(',', '.');
      extractedData.amount = parseFloat(amountStr);
    }

    // Normalize date - accept DD/MM/YYYY or YYYY-MM-DD
    if (extractedData.date) {
      const dateStr = String(extractedData.date);
      if (dateStr.includes('/')) {
        // DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = dateStr.split('/');
        extractedData.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Upload image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (user) {
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
          const { data: urlData } = supabaseClient.storage
            .from('receipts')
            .getPublicUrl(fileName);
          
          extractedData.receipt_url = urlData.publicUrl;
          console.log("Imagem salva no storage:", fileName);
        }
      } catch (storageError) {
        console.error("Erro ao salvar imagem:", storageError);
        // Continue even if storage fails
      }
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

  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao processar cupom",
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
