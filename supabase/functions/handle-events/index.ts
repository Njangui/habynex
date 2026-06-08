/**
 * HABYNEX — handle-events Edge Function
 * Point central de distribution des notifications push
 * Adapté depuis l'ancienne version — compatible avec le nouveau système
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Templates de messages par type et langue
const TEMPLATES: Record<string, Record<string, { title: string; body: string; icon: string; url: string }>> = {
  new_listing: {
    fr: {
      title: "🏠 Nouveau bien à {city} !",
      body: "{title} — {price} FCFA/mois",
      icon: "/icons/icon-192.png",
      url: "/bien/{slug}",
    },
    en: {
      title: "🏠 New property in {city}!",
      body: "{title} — {price} FCFA/month",
      icon: "/icons/icon-192.png",
      url: "/bien/{slug}",
    },
  },
  message: {
    fr: { title: "💬 Nouveau message", body: "{sender} vous a envoyé un message", icon: "/icons/icon-192.png", url: "/messages" },
    en: { title: "💬 New message", body: "{sender} sent you a message", icon: "/icons/icon-192.png", url: "/messages" },
  },
  booking: {
    fr: { title: "📅 Visite confirmée !", body: "Votre visite pour {title} est confirmée", icon: "/icons/icon-192.png", url: "/profil?tab=visites" },
    en: { title: "📅 Visit confirmed!", body: "Your visit for {title} is confirmed", icon: "/icons/icon-192.png", url: "/profil?tab=visites" },
  },
  high_views: {
    fr: { title: "🔥 Votre annonce cartonne !", body: "{title} a atteint {milestone} vues — les locataires s'intéressent !", icon: "/icons/icon-192.png", url: "/profil" },
    en: { title: "🔥 Your listing is trending!", body: "{title} reached {milestone} views!", icon: "/icons/icon-192.png", url: "/profil" },
  },
  property_match: {
    fr: { title: "✨ Bien correspondant trouvé !", body: "{title} correspond à vos critères à {city}", icon: "/icons/icon-192.png", url: "/bien/{id}" },
    en: { title: "✨ Matching property found!", body: "{title} matches your criteria in {city}", icon: "/icons/icon-192.png", url: "/bien/{id}" },
  },
  reengagement: {
    fr: { title: "🏠 Vous cherchez toujours ?", body: "De nouveaux biens viennent d'être ajoutés à Yaoundé", icon: "/icons/icon-192.png", url: "/rechercher" },
    en: { title: "🏠 Still looking?", body: "New properties just added in Yaoundé", icon: "/icons/icon-192.png", url: "/rechercher" },
  },
  agent_assigned: {
    fr: { title: "👷 Agent assigné !", body: "{agent_name} s'occupe de votre visite", icon: "/icons/icon-192.png", url: "/profil?tab=visites" },
    en: { title: "👷 Agent assigned!", body: "{agent_name} will handle your visit", icon: "/icons/icon-192.png", url: "/profil?tab=visites" },
  },
  promo: {
    fr: { title: "🎉 {promo_title}", body: "{promo_body}", icon: "/icons/icon-192.png", url: "/" },
    en: { title: "🎉 {promo_title}", body: "{promo_body}", icon: "/icons/icon-192.png", url: "/" },
  },
};

function interpolate(template: string, data: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ""));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const body = await req.json();
    const { type, record, user_ids, metadata = {} } = body;

    if (!type || !user_ids?.length) {
      return new Response(JSON.stringify({ error: "type et user_ids requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[handle-events] Type: ${type}, Users: ${user_ids.length}`);

    // Récupérer les abonnements push de ces utilisateurs
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*, profile:profiles!user_id(language)")
      .in("user_id", user_ids);

    if (subError || !subscriptions?.length) {
      console.warn("[handle-events] No subscriptions found");
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0, failed = 0, expired = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const lang = (sub.profile as any)?.language === "en" ? "en" : "fr";
        const tpl = TEMPLATES[type]?.[lang] ?? TEMPLATES[type]?.fr;
        if (!tpl) { failed++; continue; }

        const data = { ...record, ...metadata };
        const payload = JSON.stringify({
          title: interpolate(tpl.title, data),
          body: interpolate(tpl.body, data),
          icon: tpl.icon,
          badge: "/icons/icon-96.png",
          url: interpolate(tpl.url, data),
          data: { url: interpolate(tpl.url, data), type },
          tag: type,
          vibrate: [200, 100, 200],
        });

        // Appeler la fonction push-notifications
        const pushRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notifications`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              vapidPublicKey,
              vapidPrivateKey,
            }),
          }
        );

        if (pushRes.ok) {
          sent++;
        } else {
          const status = pushRes.status;
          if (status === 410 || status === 404) {
            expiredEndpoints.push(sub.endpoint);
            expired++;
          } else {
            failed++;
          }
        }
      } catch (err) {
        console.error("[handle-events] Push error:", err);
        failed++;
      }
    }

    // Nettoyer les abonnements expirés
    if (expiredEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    // Logger
    await supabase.from("push_logs").insert({
      type, title: type, message: JSON.stringify(record),
      sent_count: sent, failed_count: failed, expired_count: expired,
    }).then(() => {});

    return new Response(JSON.stringify({ success: true, sent, failed, expired }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[handle-events] Fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
