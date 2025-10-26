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

// Web Push encryption utilities
async function generateVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Create JWT header and payload
  const header = {
    typ: "JWT",
    alg: "ES256"
  };
  
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: "mailto:noreply@example.com"
  };
  
  // Base64url encode
  const base64UrlEncode = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  // Import private key for signing
  const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign the JWT
  const dataToSign = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    dataToSign
  );
  
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  
  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Import user's public key
  const userPublicKeyBytes = urlBase64ToUint8Array(userPublicKey);
  const importedUserPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserPublicKey },
    localKeyPair.privateKey,
    256
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive encryption key using HKDF
  const authBytes = urlBase64ToUint8Array(userAuth);
  const keyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  
  const prk = await crypto.subtle.importKey(
    'raw',
    new Uint8Array([...authBytes, ...new Uint8Array(sharedSecret)]),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const infoHmac = await crypto.subtle.sign('HMAC', prk, new Uint8Array([...keyInfo, ...salt]));
  const contentEncryptionKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(infoHmac).slice(0, 16),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Prepare payload with padding
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payload.length);
  paddedPayload[0] = paddingLength >> 8;
  paddedPayload[1] = paddingLength & 0xff;
  new TextEncoder().encodeInto(payload, paddedPayload.subarray(2 + paddingLength));
  
  // Encrypt
  const iv = new Uint8Array(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    contentEncryptionKey,
    paddedPayload
  );
  
  // Export local public key
  const exportedPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    publicKey: new Uint8Array(exportedPublicKey)
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📬 Processing push notification request...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Server configuration error');
    }

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

    // Send to each subscription with proper Web Push encryption
    for (const sub of subscriptions as PushSubscription[]) {
      try {
        console.log(`📨 Sending to subscription ${sub.id.substring(0, 8)}...`);
        
        // Encrypt payload using Web Push Protocol
        const payloadString = JSON.stringify(notificationData);
        const encrypted = await encryptPayload(payloadString, sub.p256dh, sub.auth);
        
        // Generate VAPID authorization header
        const authHeader = await generateVapidAuthHeader(
          sub.endpoint,
          vapidData.public_key,
          vapidData.private_key
        );
        
        // Prepare encrypted body
        const body = new Uint8Array(
          encrypted.salt.length +
          4 + // record size
          1 + // public key length
          encrypted.publicKey.length +
          encrypted.ciphertext.length
        );
        
        let offset = 0;
        body.set(encrypted.salt, offset);
        offset += encrypted.salt.length;
        
        const recordSize = encrypted.ciphertext.length + 16;
        const view = new DataView(body.buffer);
        view.setUint32(offset, recordSize, false);
        offset += 4;
        
        body[offset] = encrypted.publicKey.length;
        offset += 1;
        
        body.set(encrypted.publicKey, offset);
        offset += encrypted.publicKey.length;
        
        body.set(encrypted.ciphertext, offset);
        
        // Send encrypted notification with VAPID authentication
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Content-Length': body.length.toString(),
            'TTL': '86400',
            'Authorization': authHeader,
          },
          body: body,
        });

        if (response.ok || response.status === 201) {
          console.log(`✅ Sent successfully to ${sub.id.substring(0, 8)}`);
          sentCount++;
        } else if (response.status === 404 || response.status === 410) {
          console.log(`🗑️ Invalid subscription ${sub.id.substring(0, 8)} (${response.status})`);
          invalidSubscriptions.push(sub.id);
        } else {
          const errorText = await response.text();
          console.log(`⚠️ Unexpected status ${response.status} for ${sub.id.substring(0, 8)}: ${errorText}`);
        }
      } catch (error: any) {
        console.error(`❌ Error sending to ${sub.id.substring(0, 8)}:`, error.message);
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
  } catch (error: any) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
