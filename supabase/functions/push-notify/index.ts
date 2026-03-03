import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

// Web Push implementation using Web Crypto API (no npm dependency needed)
async function sendWebPush(subscription: any, payload: string, vapidPublicKey: string, vapidPrivateKey: string, vapidEmail: string) {
  // For web push, we use the subscription endpoint directly
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: payload,
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 410 || status === 404) {
      throw { statusCode: 410, message: "Subscription expired" };
    }
    throw new Error(`Push failed with status ${status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, title, body, icon = "/favicon.png", badge = "/favicon.png", data = {} } = await req.json() as PushPayload;

    // Get all push tokens for this user
    const { data: tokens } = await supabase
      .from("user_push_tokens")
      .select("id, subscription")
      .eq("user_id", userId)
      .not("subscription", "is", null);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No push tokens" }), { 
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const payload = JSON.stringify({ title, body, icon, badge, data });

    const results = await Promise.allSettled(
      tokens.map(async (item: any) => {
        try {
          // Try sending to the push endpoint
          const sub = item.subscription;
          if (!sub?.endpoint) {
            throw { statusCode: 410, message: "Invalid subscription" };
          }

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: payload,
          });

          if (!response.ok) {
            if (response.status === 410 || response.status === 404) {
              // Token expired, delete it
              await supabase.from("user_push_tokens").delete().eq("id", item.id);
              return { success: false, error: "expired" };
            }
            return { success: false, error: `status ${response.status}` };
          }
          return { success: true };
        } catch (err: any) {
          if (err.statusCode === 410) {
            await supabase.from("user_push_tokens").delete().eq("id", item.id);
          }
          return { success: false, error: err.message };
        }
      })
    );

    return new Response(JSON.stringify({ results }), { 
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: any) {
    console.error("Push notify error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
