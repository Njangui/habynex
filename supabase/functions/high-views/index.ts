/**
 * HABYNEX — high-views Edge Function
 *
 * Cron toutes les 6 heures (pg_cron : "0 */6 * * *")
 *
 * Logique :
 *   1. Cherche toutes les annonces publiées dont le compteur de vues
 *      vient de franchir un seuil POUR LA PREMIÈRE FOIS.
 *   2. Envoie une notification push à l'AGENT responsable de l'annonce.
 *   3. Marque le seuil comme notifié pour ne pas renvoyer la même notif.
 *
 * Seuils configurables (variable d'env VIEW_THRESHOLDS, JSON array) :
 *   Par défaut : [50, 100, 250, 500, 1000]
 *
 * 100 % Supabase — aucune dépendance externe (plus de Render).
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUSH_NOTIFICATIONS_URL =
  Deno.env.get("PUSH_NOTIFICATIONS_URL") ||
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notifications`;

const VIEW_THRESHOLDS: number[] = JSON.parse(
  Deno.env.get("VIEW_THRESHOLDS") || "[50, 100, 250, 500, 1000]"
);

const REQUEST_TIMEOUT = 10_000;

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

interface Listing {
  id: string;
  title: string;
  views_count: number;
  agent_id: string | null;
  notified_view_thresholds: number[] | null;
}

interface PushResult {
  listingId: string;
  threshold: number;
  agentId: string;
  sent: boolean;
  error?: string;
}

async function checkHighViews() {
  const supabase = getSupabase();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results: PushResult[] = [];
  const errors: string[] = [];

  const minThreshold = Math.min(...VIEW_THRESHOLDS);

  const { data: listings, error: listErr } = await supabase
    .from("listings")
    .select("id, title, views_count, agent_id, notified_view_thresholds")
    .eq("status", "published")
    .gte("views_count", minThreshold)
    .not("agent_id", "is", null);

  if (listErr) throw new Error(`Erreur lecture annonces : ${listErr.message}`);
  if (!listings?.length) {
    console.log("[high-views] Aucune annonce au-dessus du seuil minimum");
    return { checked: 0, notifications: [], errors: [] };
  }

  console.log(`[high-views] ${listings.length} annonce(s) analysée(s)`);

  // Trouver les seuils non encore notifiés pour chaque annonce
  const toNotify: Array<{ listing: Listing; threshold: number }> = [];

  for (const listing of listings as Listing[]) {
    const alreadyNotified = listing.notified_view_thresholds ?? [];
    for (const threshold of VIEW_THRESHOLDS) {
      if (listing.views_count >= threshold && !alreadyNotified.includes(threshold)) {
        toNotify.push({ listing, threshold });
        break; // un seul seuil par annonce par exécution
      }
    }
  }

  if (!toNotify.length) {
    console.log("[high-views] Aucun nouveau seuil franchi");
    return { checked: listings.length, notifications: [], errors: [] };
  }

  console.log(`[high-views] ${toNotify.length} notification(s) à envoyer`);

  // Envoyer par batch de 5
  const CHUNK = 5;
  for (let i = 0; i < toNotify.length; i += CHUNK) {
    const batch = toNotify.slice(i, i + CHUNK);

    await Promise.allSettled(
      batch.map(async ({ listing, threshold }) => {
        const result: PushResult = {
          listingId: listing.id,
          threshold,
          agentId: listing.agent_id!,
          sent: false,
        };

        try {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint")
            .eq("user_id", listing.agent_id!)
            .limit(1);

          if (!subs?.length) {
            result.error = "Agent sans subscription push";
            results.push(result);
            return;
          }

          const { emoji } = getThresholdLabel(threshold);
          const payload = {
            title: `${emoji} ${threshold} vues sur votre annonce !`,
            body: `"${truncate(listing.title, 60)}" a atteint ${threshold} vues.`,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-72.png",
            tag: `high-views-${listing.id}-${threshold}`,
            requireInteraction: false,
            data: {
              type: "high_views",
              listingId: listing.id,
              threshold,
              viewsCount: listing.views_count,
              url: `/bien/${listing.id}`,
              timestamp: new Date().toISOString(),
            },
            actions: [
              { action: "view", title: "👁️ Voir l'annonce" },
              { action: "share", title: "📤 Partager" },
            ],
          };

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

          const res = await fetch(PUSH_NOTIFICATIONS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ userId: listing.agent_id, payload }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`push-notifications ${res.status}: ${errText}`);
          }

          // Marquer le seuil comme notifié
          const updatedThresholds = [
            ...(listing.notified_view_thresholds ?? []),
            threshold,
          ];

          await supabase
            .from("listings")
            .update({ notified_view_thresholds: updatedThresholds })
            .eq("id", listing.id);

          // Logger
          await supabase.from("notification_history").insert({
            user_id: listing.agent_id,
            type: "high_views",
            title: payload.title,
            content: payload.body,
            metadata: {
              listingId: listing.id,
              threshold,
              viewsCount: listing.views_count,
              channels: ["push"],
            },
            created_at: new Date().toISOString(),
          }).catch(() => {});

          result.sent = true;
          console.log(`[high-views] ✓ Agent ${listing.agent_id} — "${listing.title}" → ${threshold} vues`);
        } catch (err: any) {
          result.error = err.message;
          errors.push(`Listing ${listing.id} (seuil ${threshold}) : ${err.message}`);
          console.error(`[high-views] ✗ Listing ${listing.id} :`, err.message);
        }

        results.push(result);
      })
    );
  }

  return { checked: listings.length, notifications: results, errors };
}

function getThresholdLabel(threshold: number) {
  if (threshold >= 1000) return { emoji: "🏆" };
  if (threshold >= 500)  return { emoji: "🚀" };
  if (threshold >= 250)  return { emoji: "🔥" };
  if (threshold >= 100)  return { emoji: "⭐" };
  return { emoji: "👁️" };
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 3) + "…" : str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t = Date.now();
  try {
    const result = await checkHighViews();
    const sent = result.notifications.filter((n) => n.sent).length;
    const failed = result.notifications.filter((n) => !n.sent).length;

    return new Response(
      JSON.stringify({
        success: true,
        checked: result.checked,
        sent,
        failed,
        thresholds: VIEW_THRESHOLDS,
        notifications: result.notifications,
        errors: result.errors,
        duration_ms: Date.now() - t,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[high-views] Erreur fatale :", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
