/**
 * HABYNEX — property-matching Edge Function
 * Matching entre nouvelles annonces et critères utilisateurs
 * Adapté: properties→listings, profiles.criteria JSON Habynex
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const BATCH_SIZE = 5, DELAY_BETWEEN_USERS = 200, MIN_MATCH_SCORE = 55;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: listings } = await supabase
      .from("listings")
      .select("id, slug, title, type, transaction, price, neighborhood_id, neighborhood:neighborhoods(name, slug, city:cities(name))")
      .eq("status", "published")
      .gte("published_at", oneHourAgo);

    if (!listings?.length) return new Response(JSON.stringify({ message: "No new listings", count: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: users } = await supabase
      .from("profiles")
      .select("id, criteria, language")
      .not("criteria", "is", null);

    if (!users?.length) return new Response(JSON.stringify({ message: "No users with criteria" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const scoreMatch = (listing: any, user: any): number => {
      const c = user.criteria || {};
      let score = 0;
      const nbh = listing.neighborhood;
      
      if (c.neighborhood_names?.includes(nbh?.name)) score += 35;
      if (c.types?.includes(listing.type)) score += 25;
      if (c.transaction === listing.transaction) score += 20;
      if (c.budget_max && listing.price <= c.budget_max) score += 15;
      if (c.budget_min && listing.price >= c.budget_min) score += 5;
      return score;
    };

    let success = 0, noMatch = 0, errors = 0;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      for (const user of batch) {
        try {
          const matches = listings
            .map(l => ({ listing: l, score: scoreMatch(l, user) }))
            .filter(m => m.score >= MIN_MATCH_SCORE)
            .sort((a, b) => b.score - a.score);
          
          if (!matches.length) { noMatch++; continue; }
          const best = matches[0].listing;
          const nbh = Array.isArray(best.neighborhood) ? best.neighborhood[0] : best.neighborhood;
          
          await fetch(`${supabaseUrl}/functions/v1/handle-events`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({
              type: "property_match",
              record: { id: best.id, slug: best.slug, title: best.title, city: (nbh?.city as any)?.name, neighborhood: nbh?.name, price: best.price, match_count: matches.length },
              user_ids: [user.id],
            }),
          });
          success++;
        } catch (err) { errors++; }
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_USERS));
      }
    }

    return new Response(JSON.stringify({ success: true, listings: listings.length, users: users.length, notified: success, no_match: noMatch, errors }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
