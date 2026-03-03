import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EventType =
  | "new_message"
  | "new_inquiry"
  | "new_review"
  | "verification_update"
  | "new_property"
  | "price_drop"
  | "high_views"
  | "listing_expired"
  | "account_verified"
  | "welcome"
  | "reengagement"
  | "new_testimonial";

interface WebhookPayload {
  type: EventType;
  record: any;
  old_record?: any;
  user_ids?: string[];
}

async function getRecipient(supabase: any, type: EventType, record: any) {
  let userId: string | null = null;

  switch (type) {
    case "new_message": {
      const { data: conv } = await supabase
        .from("conversations")
        .select("tenant_id, owner_id")
        .eq("id", record.conversation_id)
        .single();
      if (!conv) return null;
      userId = conv.tenant_id === record.sender_id ? conv.owner_id : conv.tenant_id;
      break;
    }
    case "new_inquiry":
    case "new_review":
    case "high_views": {
      const { data: prop } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", record.property_id)
        .single();
      if (!prop) return null;
      userId = prop.owner_id;
      break;
    }
    case "verification_update":
    case "account_verified":
    case "welcome":
    case "reengagement":
      userId = record.user_id || record.id;
      break;
    default:
      return null;
  }

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, language")
    .eq("user_id", userId)
    .single();

  return {
    userId,
    name: profile?.full_name || "Utilisateur",
    language: profile?.language || "fr",
  };
}

async function shouldSendPush(supabase: any, userId: string, type: EventType) {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!prefs) return true;

  const prefMap: Record<string, string> = {
    new_message: "push_new_message",
    new_inquiry: "push_new_inquiry",
    new_review: "push_new_review",
    high_views: "push_high_views",
    new_property: "push_new_property",
    price_drop: "push_price_drop",
    account_verified: "push_account",
    welcome: "push_marketing",
    reengagement: "push_marketing",
    new_testimonial: "push_listing",
  };

  const key = prefMap[type];
  if (key && prefs[key] === false) return false;

  if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const start = prefs.quiet_hours_start;
    const end = prefs.quiet_hours_end;
    if (start < end) {
      if (current >= start && current <= end) return false;
    } else {
      if (current >= start || current <= end) return false;
    }
  }

  return true;
}

function getPushMessage(type: EventType, record: any, lang: string, extra: any) {
  const fr = lang === "fr";

  switch (type) {
    case "new_message":
      return {
        title: fr ? `💬 Nouveau message` : `💬 New message`,
        body: fr ? (record.content?.substring(0, 100) || "Vous avez reçu un message") : (record.content?.substring(0, 100) || "You received a message"),
      };
    case "new_inquiry":
      return {
        title: fr ? "📩 Nouvelle demande de contact" : "📩 New contact request",
        body: fr ? `Quelqu'un est intéressé par votre bien` : `Someone is interested in your property`,
      };
    case "new_review":
      return {
        title: fr ? "⭐ Nouvel avis reçu" : "⭐ New review received",
        body: fr ? `Votre bien a reçu un avis (${record.rating}/5)` : `Your property received a review (${record.rating}/5)`,
      };
    case "verification_update":
      if (record.level_2_status === "approved") {
        return {
          title: fr ? "✅ Identité approuvée" : "✅ Identity approved",
          body: fr ? "Votre identité a été vérifiée avec succès." : "Your identity has been verified.",
        };
      } else if (record.level_2_status === "rejected") {
        return {
          title: fr ? "❌ Identité rejetée" : "❌ Identity rejected",
          body: fr ? "Votre vérification a été rejetée. Veuillez réessayer." : "Your verification was rejected. Please try again.",
        };
      }
      return null;
    case "new_property":
      return {
        title: fr ? `🏠 Nouveau bien à ${record.city || ""}` : `🏠 New property in ${record.city || ""}`,
        body: record.title || "",
      };
    case "price_drop":
      return {
        title: fr ? "💰 Baisse de prix !" : "💰 Price drop!",
        body: fr ? `${record.title}: prix réduit` : `${record.title}: price reduced`,
      };
    case "high_views":
      return {
        title: fr ? `🔥 Votre annonce est populaire !` : `🔥 Your listing is popular!`,
        body: fr ? `Votre annonce a atteint de nombreuses vues` : `Your listing has reached many views`,
      };
    case "account_verified":
      return {
        title: fr ? "✅ Compte vérifié !" : "✅ Account verified!",
        body: fr ? "Votre compte est maintenant vérifié." : "Your account is now verified.",
      };
    case "welcome":
      return {
        title: fr ? "🏠 Bienvenue sur Habynex !" : "🏠 Welcome to Habynex!",
        body: fr ? "Commencez votre recherche dès maintenant." : "Start your search now.",
      };
    default:
      return null;
  }
}

function getUrlForEvent(type: EventType, record: any): string {
  switch (type) {
    case "new_message": return `/messages?conversation=${record.conversation_id}`;
    case "new_inquiry": case "new_review": case "high_views": return "/dashboard";
    case "verification_update": return record.level_2_status === "approved" ? "/profile" : "/identity-verification";
    case "new_property": case "price_drop": return `/property/${record.id}`;
    case "account_verified": return "/profile";
    default: return "/";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: WebhookPayload = await req.json();
    const { type, record, old_record, user_ids } = payload;

    let recipients: Array<{ userId: string; name: string; language: string }> = [];

    if (user_ids && user_ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, language")
        .in("user_id", user_ids);
      if (profiles) {
        recipients = profiles.map((p: any) => ({
          userId: p.user_id,
          name: p.full_name || "Utilisateur",
          language: p.language || "fr",
        }));
      }
    } else {
      const r = await getRecipient(supabase, type, record);
      if (r) recipients.push(r);
    }

    const results = [];

    for (const r of recipients) {
      const send = await shouldSendPush(supabase, r.userId, type);
      if (!send) {
        results.push({ userId: r.userId, status: "skipped", reason: "preferences" });
        continue;
      }

      const extra = {};
      const pushMessage = getPushMessage(type, record, r.language, extra);
      if (!pushMessage) {
        results.push({ userId: r.userId, status: "skipped", reason: "no_message" });
        continue;
      }

      // Call push-notify function
      const pushResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            userId: r.userId,
            title: pushMessage.title,
            body: pushMessage.body,
            data: { url: getUrlForEvent(type, record), type },
          }),
        }
      );

      if (!pushResponse.ok) {
        results.push({ userId: r.userId, status: "error", error: await pushResponse.text() });
        continue;
      }

      results.push({ userId: r.userId, status: "sent" });

      // Log notification
      await supabase.from("notification_history").insert({
        user_id: r.userId,
        notification_type: type,
        channel: "push",
        title: pushMessage.title,
        content: pushMessage.body,
        metadata: record,
      });
    }

    return new Response(JSON.stringify({ results }), { 
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: any) {
    console.error("Push events error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
