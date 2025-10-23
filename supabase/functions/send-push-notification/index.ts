import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for Web Push Protocol
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<Response> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  // Parse the endpoint to get the push service URL
  const url = new URL(subscription.endpoint);
  
  // Create VAPID headers
  const vapidHeaders: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '86400',
    'Content-Encoding': 'aes128gcm',
  };

  try {
    // For now, send without encryption to test basic functionality
    // In production, you should implement proper encryption
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: vapidHeaders,
      body: payloadBytes,
    });

    return response;
  } catch (error) {
    console.error('Error sending push:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Missing Supabase credentials");
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from database
    const { data: vapidKeys, error: vapidError } = await supabase
      .from("vapid_keys")
      .select("public_key, private_key")
      .single();

    if (vapidError || !vapidKeys) {
      console.error("VAPID keys not found in database:", vapidError);
      return new Response(
        JSON.stringify({ 
          error: "VAPID keys not configured",
          message: "Push notifications are not set up yet. They will be configured automatically when needed." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = vapidKeys.public_key;
    const vapidPrivateKey = vapidKeys.private_key;
    const vapidSubject = "mailto:noreply@example.com";

    // Parse request body
    const payload: NotificationPayload = await req.json();
    console.log("Sending push notification to user:", payload.user_id);

    // Get all push subscriptions for the user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.user_id);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    // Prepare notification data
    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/icon-192.png",
      data: payload.data || {},
    };

    let sentCount = 0;
    const invalidSubscriptions: string[] = [];

    // Send notification to each subscription
    for (const subscription of subscriptions as PushSubscription[]) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        console.log(`Sending notification to subscription ${subscription.id}`);
        
        // Send the notification
        const response = await sendWebPush(
          pushSubscription,
          JSON.stringify(notificationData),
          {
            publicKey: vapidPublicKey,
            privateKey: vapidPrivateKey,
            subject: vapidSubject,
          }
        );

        if (response.status === 201 || response.status === 200) {
          sentCount++;
          console.log(`Notification sent successfully to subscription ${subscription.id}`);
        } else if (response.status === 404 || response.status === 410) {
          console.log(`Invalid subscription ${subscription.id}, marking for deletion`);
          invalidSubscriptions.push(subscription.id);
        } else {
          console.error(`Unexpected response status ${response.status} for subscription ${subscription.id}`);
        }
      } catch (error: any) {
        console.error(`Error sending to subscription ${subscription.id}:`, error);
        // Mark as potentially invalid
        invalidSubscriptions.push(subscription.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", invalidSubscriptions);

      if (deleteError) {
        console.error("Error deleting invalid subscriptions:", deleteError);
      } else {
        console.log(`Removed ${invalidSubscriptions.length} invalid subscription(s)`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications processed",
        sent: sentCount,
        invalidSubscriptions: invalidSubscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
