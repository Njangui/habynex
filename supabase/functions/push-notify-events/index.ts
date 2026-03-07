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

// ── Fetch enriched context ──
async function enrichRecord(supabase: any, type: EventType, record: any) {
  const enriched = { ...record };

  // Fetch property details (title, city, neighborhood, image)
  if (record.property_id) {
    const { data: prop } = await supabase
      .from("properties")
      .select("owner_id, title, city, neighborhood, images, price, price_unit")
      .eq("id", record.property_id)
      .single();
    if (prop) {
      enriched._property_title = prop.title;
      enriched._property_city = prop.city;
      enriched._property_neighborhood = prop.neighborhood;
      enriched._property_image = prop.images?.[0] || null;
      enriched._property_price = prop.price;
      enriched._property_price_unit = prop.price_unit;
      enriched._property_owner_id = prop.owner_id;
    }
  }

  // Fetch sender profile name for messages
  if (type === "new_message" && record.sender_id) {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", record.sender_id)
      .single();
    enriched._sender_name = senderProfile?.full_name || "Quelqu'un";
  }

  return enriched;
}

// ── Recipient Resolution ──
async function getRecipient(supabase: any, type: EventType, record: any) {
  let userId: string | null = null;

  switch (type) {
    case "new_message": {
      if (!record.conversation_id) return null;
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
      userId = record._property_owner_id || null;
      break;
    }
    case "verification_update":
    case "account_verified":
    case "welcome":
    case "reengagement":
      userId = record.user_id || record.id;
      break;
    case "new_property":
    case "price_drop":
    case "listing_expired":
      userId = record.owner_id || record.user_id;
      break;
    default:
      return null;
  }

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, language, city")
    .eq("user_id", userId)
    .single();

  return {
    userId,
    name: profile?.full_name || "Utilisateur",
    firstName: (profile?.full_name || "").split(" ")[0] || "Utilisateur",
    language: profile?.language || "fr",
    city: profile?.city || null,
  };
}

// ── Preference Check ──
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

  // Quiet hours
  if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const { quiet_hours_start: start, quiet_hours_end: end } = prefs;
    if (start < end ? current >= start && current <= end : current >= start || current <= end) {
      console.log("[events] Quiet hours active for:", userId);
      return false;
    }
  }

  return true;
}

// ── Personalized Message Builder ──
function getPushMessage(type: EventType, record: any, recipient: { firstName: string; language: string }) {
  const fr = recipient.language === "fr";
  const name = recipient.firstName;
  const senderName = record._sender_name || record.sender_name || "Quelqu'un";
  const propTitle = record._property_title || record.title || "";
  const city = record._property_city || record.city || "";
  const neighborhood = record._property_neighborhood || record.neighborhood || "";
  const price = record._property_price || record.price;
  const priceFormatted = price ? `${Number(price).toLocaleString("fr-FR")} FCFA` : "";
  const image = record._property_image || record.images?.[0] || null;

  // Build location string
  const location = [neighborhood, city].filter(Boolean).join(", ");

  // Excerpt for messages (max 60 chars to tease)
  const messageExcerpt = record.content
    ? record.content.substring(0, 60) + (record.content.length > 60 ? "…" : "")
    : "";

  let result: { title: string; body: string; image?: string } | null = null;

  switch (type) {
    case "new_message":
      result = {
        title: fr ? `💬 ${senderName} vous a écrit` : `💬 ${senderName} sent you a message`,
        body: fr
          ? `${name}, "${messageExcerpt}"${propTitle ? ` — ${propTitle}` : ""}`
          : `${name}, "${messageExcerpt}"${propTitle ? ` — ${propTitle}` : ""}`,
      };
      break;

    case "new_inquiry":
      result = {
        title: fr ? `📩 Nouvelle demande de ${senderName}` : `📩 New inquiry from ${senderName}`,
        body: fr
          ? `${name}, ${senderName} s'intéresse à votre bien${propTitle ? ` "${propTitle}"` : ""}${location ? ` à ${location}` : ""}.`
          : `${name}, ${senderName} is interested in your property${propTitle ? ` "${propTitle}"` : ""}${location ? ` in ${location}` : ""}.`,
        image,
      };
      break;

    case "new_review":
      result = {
        title: fr ? `⭐ Nouvel avis sur votre bien` : `⭐ New review on your property`,
        body: fr
          ? `${name}, votre bien "${propTitle}" a reçu un avis ${record.rating}/5${location ? ` à ${location}` : ""}.`
          : `${name}, your property "${propTitle}" received a ${record.rating}/5 review${location ? ` in ${location}` : ""}.`,
        image,
      };
      break;

    case "verification_update":
      if (record.level_2_status === "approved") {
        result = {
          title: fr ? "✅ Identité vérifiée" : "✅ Identity verified",
          body: fr
            ? `${name}, votre identité a été vérifiée avec succès ! Publiez vos annonces dès maintenant.`
            : `${name}, your identity has been verified! Start publishing your listings now.`,
        };
      } else if (record.level_2_status === "rejected") {
        result = {
          title: fr ? "❌ Vérification refusée" : "❌ Verification rejected",
          body: fr
            ? `${name}, veuillez resoumettre vos documents d'identité.`
            : `${name}, please resubmit your identity documents.`,
        };
      }
      break;

    case "new_property":
      result = {
        title: fr ? `🏠 Nouveau bien${city ? ` à ${city}` : ""}` : `🏠 New property${city ? ` in ${city}` : ""}`,
        body: fr
          ? `${name}, ${propTitle}${neighborhood ? ` – ${neighborhood}` : ""}${priceFormatted ? ` – ${priceFormatted}` : ""}`
          : `${name}, ${propTitle}${neighborhood ? ` – ${neighborhood}` : ""}${priceFormatted ? ` – ${priceFormatted}` : ""}`,
        image,
      };
      break;

    case "price_drop":
      result = {
        title: fr ? "💰 Baisse de prix !" : "💰 Price drop!",
        body: fr
          ? `${name}, le prix de "${propTitle}"${location ? ` à ${location}` : ""} a été réduit à ${priceFormatted}.`
          : `${name}, the price of "${propTitle}"${location ? ` in ${location}` : ""} was reduced to ${priceFormatted}.`,
        image,
      };
      break;

    case "high_views":
      result = {
        title: fr ? "🔥 Votre annonce cartonne !" : "🔥 Your listing is trending!",
        body: fr
          ? `${name}, "${propTitle}" attire beaucoup de visiteurs${location ? ` à ${location}` : ""} !`
          : `${name}, "${propTitle}" is getting a lot of visitors${location ? ` in ${location}` : ""}!`,
        image,
      };
      break;

    case "listing_expired":
      result = {
        title: fr ? "⏰ Annonce expirée" : "⏰ Listing expired",
        body: fr
          ? `${name}, votre annonce "${propTitle}" a expiré. Renouvelez-la pour rester visible.`
          : `${name}, your listing "${propTitle}" has expired. Renew it to stay visible.`,
      };
      break;

    case "account_verified":
      result = {
        title: fr ? "✅ Compte vérifié !" : "✅ Account verified!",
        body: fr
          ? `Félicitations ${name} ! Votre compte est vérifié. Profitez de tous les avantages Habinex.`
          : `Congratulations ${name}! Your account is verified. Enjoy all Habinex benefits.`,
      };
      break;

    case "welcome":
      result = {
        title: fr ? "🏠 Bienvenue sur Habinex !" : "🏠 Welcome to Habinex!",
        body: fr
          ? `${name}, trouvez votre logement idéal parmi nos annonces vérifiées. Commencez maintenant !`
          : `${name}, find your ideal home among our verified listings. Start now!`,
      };
      break;

    case "reengagement":
      result = {
        title: fr ? "👋 Vous nous manquez !" : "👋 We miss you!",
        body: fr
          ? `${name}, de nouvelles propriétés vous attendent${recipient.city ? ` à ${recipient.city}` : ""}. Revenez voir les dernières offres !`
          : `${name}, new properties are waiting for you${recipient.city ? ` in ${recipient.city}` : ""}. Come check the latest listings!`,
      };
      break;
  }

  return result;
}

function getUrlForEvent(type: EventType, record: any): string {
  switch (type) {
    case "new_message": return `/messages?conversation=${record.conversation_id}`;
    case "new_inquiry": case "new_review": case "high_views": return "/dashboard";
    case "verification_update": return record.level_2_status === "approved" ? "/profile" : "/identity-verification";
    case "new_property": case "price_drop": return `/property/${record.id || record.property_id}`;
    case "account_verified": return "/profile";
    default: return "/";
  }
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[events] === START ===");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: WebhookPayload = await req.json();
    const { type, record: rawRecord, user_ids } = payload;

    console.log("[events] Type:", type, "user_ids:", user_ids?.length || 0);

    // Enrich record with property/sender details
    const record = await enrichRecord(supabase, type, rawRecord);

    let recipients: Array<{ userId: string; name: string; firstName: string; language: string; city: string | null }> = [];

    if (user_ids?.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, language, city")
        .in("user_id", user_ids);
      if (profiles) {
        recipients = profiles.map((p: any) => ({
          userId: p.user_id,
          name: p.full_name || "Utilisateur",
          firstName: (p.full_name || "").split(" ")[0] || "Utilisateur",
          language: p.language || "fr",
          city: p.city || null,
        }));
      }
    } else {
      const r = await getRecipient(supabase, type, record);
      if (r) recipients.push(r);
    }

    console.log("[events] Recipients:", recipients.length);

    if (!recipients.length) {
      return new Response(JSON.stringify({ message: "No recipients", type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const r of recipients) {
      const send = await shouldSendPush(supabase, r.userId, type);
      if (!send) {
        results.push({ userId: r.userId, status: "skipped", reason: "preferences" });
        continue;
      }

      const pushMessage = getPushMessage(type, record, r);
      if (!pushMessage) {
        results.push({ userId: r.userId, status: "skipped", reason: "no_message" });
        continue;
      }

      console.log("[events] Sending:", pushMessage.title, "to:", r.userId);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
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
              image: pushMessage.image || undefined,
              data: {
                url: getUrlForEvent(type, record),
                type,
                contactUrl: "/messages",
                propertyTitle: record._property_title || undefined,
                city: record._property_city || undefined,
              },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        const pushResult = await pushResponse.json();
        console.log("[events] Push response:", JSON.stringify(pushResult));

        results.push({ userId: r.userId, status: pushResponse.ok ? "sent" : "error", details: pushResult });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        console.error("[events] Fetch error:", fetchErr.message);
        results.push({ userId: r.userId, status: "error", error: fetchErr.message });
      }

      // Log to notification_history
      try {
        await supabase.from("notification_history").insert({
          user_id: r.userId,
          notification_type: type,
          channel: "push",
          title: pushMessage.title,
          content: pushMessage.body,
          metadata: { ...record, image: pushMessage.image },
        });
      } catch (logErr: any) {
        console.error("[events] History log error:", logErr.message);
      }
    }

    console.log("[events] === DONE ===", JSON.stringify(results));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[events] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
