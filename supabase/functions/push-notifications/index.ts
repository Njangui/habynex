/**
 * HABYNEX — push-notifications Edge Function
 * Envoi réel de notifications push avec chiffrement VAPID/WebPush
 * Adapté depuis l'ancienne version avec chiffrement AES-128-GCM complet
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Chiffrement VAPID ────────────────────────────────────────────
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function createVapidJWT(audience: string, vapidPrivateKeyB64: string, vapidPublicKeyB64: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 43200, sub: "mailto:support@habynex.com" };

  const encode = (obj: object) => uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const privateKeyData = base64UrlToUint8Array(vapidPrivateKeyB64);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", privateKeyData,
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  ).catch(async () => {
    // Fallback: essayer avec raw
    return await crypto.subtle.importKey(
      "raw", privateKeyData.slice(-32),
      { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
    );
  });

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(sig))}`;
}

async function encryptPayload(
  payload: string,
  clientPublicKey: Uint8Array,
  authSecret: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Générer une paire de clés éphémères pour le chiffrement
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
  ) as CryptoKeyPair;

  const serverPublicKeyBuffer = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyBuffer);

  // Importer la clé publique du client
  const clientKey = await crypto.subtle.importKey(
    "raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  // Dériver le secret partagé
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: "ECDH", public: clientKey },
    serverKeyPair.privateKey,
    { name: "HKDF" }, false, ["deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF pour extraire la clé de chiffrement
  const prk = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: new Uint8Array(0) },
    sharedSecret, { name: "AES-GCM", length: 128 }, false, ["encrypt"]
  );

  // Chiffrer
  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array([0, ...payloadBytes]); // padding byte
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: salt.slice(0, 12) },
    prk,
    padded
  );

  return { ciphertext: new Uint8Array(encrypted), salt, serverPublicKey };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { subscription, payload: payloadStr, vapidPublicKey, vapidPrivateKey } = body;

    if (!subscription?.endpoint || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = subscription.endpoint;
    const audience = new URL(endpoint).origin;
    const jwt = await createVapidJWT(audience, vapidPrivateKey, vapidPublicKey);

    const headers: Record<string, string> = {
      "Authorization": `vapid t=${jwt},k=${vapidPublicKey}`,
      "TTL": "86400",
      "Urgency": "normal",
    };

    let body_content: BodyInit | null = null;

    // Chiffrer si on a les clés du client
    if (subscription.keys?.p256dh && subscription.keys?.auth && payloadStr) {
      try {
        const clientPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
        const authSecret = base64UrlToUint8Array(subscription.keys.auth);
        const { ciphertext, salt, serverPublicKey } = await encryptPayload(payloadStr, clientPublicKey, authSecret);

        // Header RFC 8291
        const recordSize = 4096;
        const header = new Uint8Array(21 + serverPublicKey.length + ciphertext.length);
        let pos = 0;
        header.set(salt, pos); pos += 16;
        new DataView(header.buffer).setUint32(pos, recordSize, false); pos += 4;
        header[pos++] = serverPublicKey.length;
        header.set(serverPublicKey, pos); pos += serverPublicKey.length;
        header.set(ciphertext, pos);

        body_content = header;
        headers["Content-Encoding"] = "aes128gcm";
        headers["Content-Type"] = "application/octet-stream";
      } catch (encErr) {
        console.warn("[push-notifications] Encryption failed, sending unencrypted:", encErr);
        body_content = payloadStr;
        headers["Content-Type"] = "application/json";
      }
    } else {
      body_content = payloadStr ?? null;
      if (body_content) headers["Content-Type"] = "application/json";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: body_content,
    });

    const statusCode = response.status;
    console.log(`[push-notifications] Status: ${statusCode}`);

    return new Response(JSON.stringify({ statusCode, success: statusCode < 300 }), {
      status: statusCode < 500 ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[push-notifications] Fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
