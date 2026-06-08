import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url), query = url.searchParams.get("q"), type = url.searchParams.get("type") || "search";
  if (!query) return new Response(JSON.stringify({ error: "q requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const nominatimUrl = type === "reverse"
    ? `https://nominatim.openstreetmap.org/reverse?format=json&lat=${query.split(",")[0]}&lon=${query.split(",")[1]}&zoom=18&addressdetails=1`
    : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=cm`;
  const res = await fetch(nominatimUrl, { headers: { "User-Agent": "Habynex/2.0 (support@habynex.com)", "Accept-Language": "fr" } });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
