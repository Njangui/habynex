/**
 * HABYNEX — reengagement Edge Function
 * Réactivation des utilisateurs inactifs avec une annonce récente
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const BATCH_SIZE = 10, DELAY = 150;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const body = await req.json().catch(() => ({}));
    const inactiveDays = body.inactive_days || 7;
    const cutoff = new Date(Date.now() - inactiveDays * 86400000).toISOString();

    // Utilisateurs avec push actif
    const { data: subs } = await supabase.from("push_subscriptions").select("user_id").gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString());
    if (!subs?.length) return new Response(JSON.stringify({ message: "No subscribers" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    const userIds = [...new Set(subs.map((s: any) => s.user_id))];
    
    // Exclure ceux récemment notifiés (reengagement)
    const { data: recent } = await supabase.from("push_logs").select("target_user_id").eq("type", "reengagement").gte("created_at", cutoff);
    const recentIds = new Set((recent || []).map((r: any) => r.target_user_id).filter(Boolean));
    const eligible = userIds.filter((id: string) => !recentIds.has(id));
    
    if (!eligible.length) return new Response(JSON.stringify({ message: "All recently notified" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Annonce la plus récente
    const { data: latest } = await supabase.from("listings").select("id, slug, title, price, neighborhood:neighborhoods(name, city:cities(name)), media:listing_media(url, is_cover)").eq("status", "published").order("published_at", { ascending: false }).limit(1).single();

    let sent = 0, failed = 0;
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);
      for (const userId of batch) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/handle-events`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({
              type: "reengagement",
              record: {
                id: latest?.id, slug: latest?.slug, title: latest?.title, price: latest?.price,
                city: (latest?.neighborhood as any)?.city?.name,
              },
              user_ids: [userId],
            }),
          });
          if (res.ok) sent++; else failed++;
        } catch { failed++; }
        await new Promise(r => setTimeout(r, DELAY));
      }
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ success: true, total: eligible.length, sent, failed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
