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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Processing recurring expenses...");

    // Get all active recurring expenses that are due
    const today = new Date().toISOString().split("T")[0];
    const { data: recurring, error: recurringError } = await supabaseClient
      .from("recurring_expenses")
      .select("*")
      .eq("is_active", true)
      .lte("next_occurrence", today);

    if (recurringError) throw recurringError;

    console.log(`📊 Found ${recurring?.length || 0} recurring expenses to process`);

    for (const rec of recurring || []) {
      try {
        // Check if expense already exists for this occurrence
        const { data: existingExpense } = await supabaseClient
          .from("expenses")
          .select("id")
          .eq("user_id", rec.user_id)
          .eq("date", rec.next_occurrence)
          .eq("merchant", rec.merchant)
          .eq("amount", rec.amount)
          .single();

        if (existingExpense) {
          console.log(`Expense already exists for ${rec.merchant} on ${rec.next_occurrence}`);
          continue;
        }

        // Create expense
        const { error: expenseError } = await supabaseClient
          .from("expenses")
          .insert({
            user_id: rec.user_id,
            merchant: rec.merchant,
            amount: rec.amount,
            category_id: rec.category_id,
            account_id: rec.account_id,
            payment_method: rec.payment_method,
            date: rec.next_occurrence,
            notes: rec.notes,
            source: "recurring",
          });

        if (expenseError) {
          console.error(`Error creating expense for ${rec.merchant}:`, expenseError);
          continue;
        }

        // Create notification
        await supabaseClient.from("notifications").insert({
          user_id: rec.user_id,
          type: "recurring_expense_created",
          payload: {
            merchant: rec.merchant,
            amount: rec.amount,
            date: rec.next_occurrence,
          },
        });

        // Calculate next occurrence
        const nextDate = new Date(rec.next_occurrence);
        if (rec.frequency === "daily") {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (rec.frequency === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (rec.frequency === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (rec.frequency === "yearly") {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        const nextOccurrence = nextDate.toISOString().split("T")[0];

        // Check if we should stop (end_date reached)
        const shouldStop = rec.end_date && nextOccurrence > rec.end_date;

        // Update recurring expense
        await supabaseClient
          .from("recurring_expenses")
          .update({
            next_occurrence: nextOccurrence,
            is_active: !shouldStop,
          })
          .eq("id", rec.id);

        console.log(`✅ Created expense for ${rec.merchant}`);
      } catch (error) {
        console.error(`Error processing recurring expense ${rec.merchant}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: recurring?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-recurring-expenses:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
