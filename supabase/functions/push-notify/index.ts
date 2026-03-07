import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Base64URL helpers ──

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Import VAPID private key as JWK ──
// The VAPID private key is a 32-byte raw key in base64url. We need to derive the public key
// from the VAPID_PUBLIC_KEY (65-byte uncompressed point) to build a proper JWK.

async function importVapidKeys(
  privateKeyB64: string,
  publicKeyB64: string
): Promise<CryptoKey> {
  const privateKeyRaw = base64UrlDecode(privateKeyB64);
  const publicKeyRaw = base64UrlDecode(publicKeyB64);

  // Extract x, y from uncompressed public key (0x04 || x || y)
  const x = base64UrlEncode(publicKeyRaw.slice(1, 33));
  const y = base64UrlEncode(publicKeyRaw.slice(33, 65));
  const d = base64UrlEncode(privateKeyRaw);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
  };

  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

// ── Create VAPID JWT ──

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  if (der[0] !== 0x30) return der;

  let offset = 2;
  if (der[offset] !== 0x02) return der;
  offset++;
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;

  if (der[offset] !== 0x02) return der;
  offset++;
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);

  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  signingKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    encoder.encode(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: subject }))
  );
  const unsigned = `${header}.${payload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    encoder.encode(unsigned)
  );

  const rawSig = derToRaw(new Uint8Array(signature));
  return `${unsigned}.${base64UrlEncode(rawSig)}`;
}

// ── Web Push encryption (aes128gcm) ──

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberPublicKeyRaw = base64UrlDecode(subscriptionKeys.p256dh);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Export local public key
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Auth secret
  const authSecret = base64UrlDecode(subscriptionKeys.auth);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM
  const authInfo = encoder.encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(
    authInfo.length + subscriberPublicKeyRaw.length + localPublicKeyRaw.length
  );
  authInfoFull.set(authInfo);
  authInfoFull.set(subscriberPublicKeyRaw, authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + subscriberPublicKeyRaw.length);

  const ikm = await hkdf(authSecret, sharedSecret, authInfoFull, 32);

  // Derive CEK and nonce
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad the payload (add delimiter byte 0x02 and padding)
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, paddedPayload)
  );

  // Build aes128gcm header: salt (16) + rs (4) + idLen (1) + keyId (65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header);
  body.set(encrypted, header.length);

  return { ciphertext: body, salt, localPublicKey: localPublicKeyRaw };
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);

  // Extract
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  // Expand
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;

  const output = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return output.slice(0, length);
}

// ── Main handler ──

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[push-notify] VAPID keys missing!");
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signingKey = await importVapidKeys(vapidPrivateKey, vapidPublicKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reqBody = (await req.json()) as PushPayload;
    const {
      userId,
      title,
      body: msgBody,
      icon = "/favicon.png",
      badge = "/favicon.png",
      image,
      data = {},
    } = reqBody;

    console.log("[push-notify] userId:", userId, "title:", title);

    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("id, subscription, token")
      .eq("user_id", userId)
      .not("subscription", "is", null);

    if (tokensError) {
      console.error("[push-notify] Token fetch error:", tokensError);
      return new Response(JSON.stringify({ error: "Token fetch failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokens?.length) {
      console.log("[push-notify] No tokens for user:", userId);
      return new Response(JSON.stringify({ message: "No tokens", userId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[push-notify] Found", tokens.length, "token(s)");

    const payload = JSON.stringify({ title, body: msgBody, icon, badge, image, data });

    const results = await Promise.allSettled(
      tokens.map(async (item: any) => {
        const sub = item.subscription;

        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
          console.error("[push-notify] Invalid subscription:", item.id);
          await supabase.from("user_push_tokens").delete().eq("id", item.id);
          return { success: false, tokenId: item.id, error: "invalid_subscription" };
        }

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            // Encrypt the payload
            const { ciphertext } = await encryptPayload(payload, sub.keys);

            // Build VAPID auth
            const url = new URL(sub.endpoint);
            const audience = `${url.protocol}//${url.host}`;
            const jwt = await createVapidJwt(audience, "mailto:contact@habinex.com", signingKey);

            const response = await fetch(sub.endpoint, {
              method: "POST",
              headers: {
                Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
                "Content-Encoding": "aes128gcm",
                "Content-Type": "application/octet-stream",
                TTL: "86400",
                Urgency: "high",
              },
              body: ciphertext,
            });

            const status = response.status;
            const responseBody = await response.text();

            console.log("[push-notify] Token:", item.id, "status:", status);

            if (status === 201 || status === 200) {
              return { success: true, tokenId: item.id };
            }

            if (status === 404 || status === 410) {
              console.log("[push-notify] Removing expired token:", item.id);
              await supabase.from("user_push_tokens").delete().eq("id", item.id);
              return { success: false, tokenId: item.id, error: "expired", removed: true };
            }

            if ((status === 429 || status >= 500) && attempt === 0) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }

            return {
              success: false,
              tokenId: item.id,
              error: `status_${status}`,
              body: responseBody,
            };
          } catch (err: any) {
            console.error("[push-notify] Error for token:", item.id, err.message);
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            return { success: false, tokenId: item.id, error: err.message };
          }
        }

        return { success: false, tokenId: item.id, error: "max_retries" };
      })
    );

    const summary = {
      total: results.length,
      sent: results.filter((r) => r.status === "fulfilled" && (r.value as any)?.success).length,
      failed: results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as any)?.success)
      ).length,
      details: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: (r as any).reason?.message }
      ),
    };

    console.log("[push-notify] Summary: sent=", summary.sent, "failed=", summary.failed);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[push-notify] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
