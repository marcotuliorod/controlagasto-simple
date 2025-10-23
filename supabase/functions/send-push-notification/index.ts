import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured. Please set VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY secrets.');
      return new Response(
        JSON.stringify({ 
          error: 'Push notifications not configured. Please contact administrator.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const payload: NotificationPayload = await req.json();
    console.log('Sending push notification to user:', payload.userId);

    // Get all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user:', payload.userId);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    let sentCount = 0;
    const invalidSubscriptions: string[] = [];

    // Send notification to each subscription
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const notificationData = {
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          tag: payload.tag || 'default',
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          requireInteraction: payload.requireInteraction || false,
        };

        // Use web-push library to send notification
        // For this implementation, we'll use fetch to send to the push service
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400', // 24 hours
          },
          body: JSON.stringify(notificationData),
        });

        if (response.status === 201) {
          sentCount++;
          console.log('Push notification sent successfully to:', sub.endpoint);
        } else if (response.status === 404 || response.status === 410) {
          // Subscription is no longer valid
          invalidSubscriptions.push(sub.id);
          console.log('Invalid subscription found:', sub.endpoint);
        } else {
          console.error('Error sending push notification:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Error sending to subscription:', error);
        invalidSubscriptions.push(sub.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', invalidSubscriptions);

      if (deleteError) {
        console.error('Error deleting invalid subscriptions:', deleteError);
      } else {
        console.log(`Removed ${invalidSubscriptions.length} invalid subscription(s)`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        sent: sentCount,
        invalid: invalidSubscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
