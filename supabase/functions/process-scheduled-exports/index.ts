import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify authentication token if provided
    const authHeader = req.headers.get('X-Cron-Secret');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== cronSecret) {
      console.error('Unauthorized access attempt to process-scheduled-exports');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Processing scheduled exports...");

    // Get all active exports that are due
    const now = new Date().toISOString();
    const { data: exports, error: exportsError } = await supabaseClient
      .from("scheduled_exports")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now);

    if (exportsError) throw exportsError;

    console.log(`📊 Found ${exports?.length || 0} exports to process`);

    for (const exportConfig of exports || []) {
      try {
        console.log(`Processing export: ${exportConfig.name} for user ${exportConfig.user_id}`);

        // Call export-data or export-pdf based on format
        const functionName = exportConfig.format === "pdf" ? "export-pdf" : "export-data";
        
        const { data: exportData, error: exportError } = await supabaseClient.functions.invoke(
          functionName,
          {
            body: {
              period: exportConfig.filters,
            },
          }
        );

        if (exportError) {
          console.error(`Error processing export ${exportConfig.name}:`, exportError);
          continue;
        }

        // Create notification for user
        await supabaseClient.from("notifications").insert({
          user_id: exportConfig.user_id,
          type: "scheduled_export_ready",
          payload: {
            export_name: exportConfig.name,
            format: exportConfig.format,
            generated_at: new Date().toISOString(),
          },
        });

        // Calculate next run time
        const nextRun = new Date();
        if (exportConfig.frequency === "daily") {
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (exportConfig.frequency === "weekly") {
          nextRun.setDate(nextRun.getDate() + 7);
        } else if (exportConfig.frequency === "monthly") {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        // Update export record
        await supabaseClient
          .from("scheduled_exports")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
          })
          .eq("id", exportConfig.id);

        console.log(`✅ Export ${exportConfig.name} processed successfully`);
      } catch (error) {
        console.error(`Error processing export ${exportConfig.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: exports?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-scheduled-exports:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
