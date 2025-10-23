const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Function to generate VAPID keys using Web Crypto API
async function generateVAPIDKeys() {
  // Generate ECDSA P-256 key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Export public key
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKey = arrayBufferToBase64Url(publicKeyBuffer);

  // Export private key
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKey = arrayBufferToBase64Url(privateKeyBuffer);

  return { publicKey, privateKey };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating VAPID keys...');

    // Generate VAPID keys
    const vapidKeys = await generateVAPIDKeys();

    console.log('VAPID keys generated successfully');

    return new Response(
      JSON.stringify({
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        instructions: [
          '1. Copie a PRIVATE KEY e adicione como secret no Supabase com o nome VAPID_PRIVATE_KEY',
          '2. Copie a PUBLIC KEY e atualize o arquivo src/hooks/usePushNotifications.ts',
          '3. Adicione também um secret VAPID_SUBJECT com seu email (ex: mailto:seu-email@example.com)'
        ]
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to generate VAPID keys'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
