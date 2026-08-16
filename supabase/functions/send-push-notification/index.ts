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
  url?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📬 Processing push notification request...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Server configuration error');
    }

    // Check for CRON_SECRET header (for cron-triggered calls)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const cronSecretHeader = req.headers.get('X-Cron-Secret');
    const isCronCall = cronSecretHeader && cronSecret && cronSecretHeader === cronSecret;

    // If not a cron call, require authentication
    if (!isCronCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Missing or invalid Authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate JWT token using service client
      const supabaseAuth = createClient(supabaseUrl, supabaseServiceRoleKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
      
      if (userError || !user) {
        console.error('❌ Invalid token:', userError?.message);
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Authenticated user:', user.id);
    } else {
      console.log('✅ Authenticated via CRON_SECRET');
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch VAPID keys from database
    console.log('🔑 Fetching VAPID keys...');
    const { data: vapidData, error: vapidError } = await supabase
      .from('vapid_keys')
      .select('public_key, private_key')
      .maybeSingle();

    if (vapidError) {
      console.error('❌ Error fetching VAPID keys:', vapidError);
      throw new Error('VAPID keys error: ' + vapidError.message);
    }

    if (!vapidData) {
      console.error('❌ No VAPID keys found');
      throw new Error('VAPID keys not configured');
    }

    console.log('✅ VAPID keys retrieved');

    // Parse notification payload
    const payload: NotificationPayload = await req.json();
    console.log('📦 Payload:', { user_id: payload.user_id, title: payload.title });

    if (!payload.user_id || !payload.title || !payload.body) {
      throw new Error('Missing required fields: user_id, title, body');
    }

    // Fetch user's push subscriptions
    console.log('🔍 Fetching subscriptions for user:', payload.user_id);
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No subscriptions found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subscriptions found',
          sent: 0,
          removed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Found ${subscriptions.length} subscription(s)`);

    // Prepare notification data
    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      data: {
        url: payload.url || '/',
        timestamp: Date.now(),
      },
    };

    let sentCount = 0;
    const invalidSubscriptions: string[] = [];

    // Send to each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      try {
        console.log(`📨 Sending to subscription ${sub.id.substring(0, 8)}...`);
        
        // Simple POST to the push service endpoint
        // Note: This is a simplified version. Production should use proper Web Push encryption
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: JSON.stringify(notificationData),
        });

        if (response.ok || response.status === 201) {
          console.log(`✅ Sent successfully to ${sub.id.substring(0, 8)}`);
          sentCount++;
        } else if (response.status === 404 || response.status === 410) {
          console.log(`🗑️ Invalid subscription ${sub.id.substring(0, 8)} (${response.status})`);
          invalidSubscriptions.push(sub.id);
        } else {
          console.log(`⚠️ Unexpected status ${response.status} for ${sub.id.substring(0, 8)}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error sending to ${sub.id.substring(0, 8)}:`, message);
        // Mark as potentially invalid
        invalidSubscriptions.push(sub.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      console.log(`🗑️ Removing ${invalidSubscriptions.length} invalid subscription(s)...`);
      
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', invalidSubscriptions);

      if (deleteError) {
        console.error('❌ Error deleting invalid subscriptions:', deleteError);
      } else {
        console.log('✅ Invalid subscriptions removed');
      }
    }

    console.log(`✅ Process complete: ${sentCount} sent, ${invalidSubscriptions.length} removed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        removed: invalidSubscriptions.length,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('❌ Error in send-push-notification:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
