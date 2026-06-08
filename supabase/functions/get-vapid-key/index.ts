const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!VAPID_PUBLIC_KEY) return new Response(JSON.stringify({ error: "VAPID_PUBLIC_KEY not configured" }), { status: 500, headers: corsHeaders });
  return new Response(JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY }), { headers: corsHeaders });
});
