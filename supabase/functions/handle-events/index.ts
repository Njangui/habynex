import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// ── Configuration ──
const PUSH_FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`;
const REQUEST_TIMEOUT = 15000; // 15s
const RATE_LIMIT_DELAY = 100; // 100ms entre chaque envoi

// ── Enrichissement du contexte ──
async function enrichRecord(supabase: any, type: EventType, record: any) {
  const enriched = { ...record };

  if (record.property_id) {
    const { data: prop, error } = await supabase
      .from("properties")
      .select("owner_id, title, city, neighborhood, images, price, price_unit")
      .eq("id", record.property_id)
      .single();
    
    if (error) {
      console.warn("[events] Property fetch error:", error.message);
    } else if (prop) {
      enriched._property_title = prop.title;
      enriched._property_city = prop.city;
      enriched._property_neighborhood = prop.neighborhood;
      enriched._property_image = prop.images?.[0] || null;
      enriched._property_price = prop.price;
      enriched._property_price_unit = prop.price_unit;
      enriched._property_owner_id = prop.owner_id;
    }
  }

  if (type === "new_message" && record.sender_id) {
    const { data: senderProfile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", record.sender_id)
      .single();
    
    if (error) {
      console.warn("[events] Sender fetch error:", error.message);
    } else {
      enriched._sender_name = senderProfile?.full_name || "Quelqu'un";
    }
  }

  return enriched;
}

// ── Résolution des destinataires ──
async function getRecipient(supabase: any, type: EventType, record: any) {
  let userId: string | null = null;

  switch (type) {
    case "new_message": {
      if (!record.conversation_id) {
        console.warn("[events] No conversation_id for new_message");
        return null;
      }
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("tenant_id, owner_id")
        .eq("id", record.conversation_id)
        .single();
      
      if (error || !conv) {
        console.warn("[events] Conversation fetch error:", error?.message);
        return null;
      }
      userId = conv.tenant_id === record.sender_id ? conv.owner_id : conv.tenant_id;
      break;
    }
    
    case "new_inquiry":
    case "new_review":
    case "high_views":
      userId = record._property_owner_id || null;
      break;
      
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
      console.warn("[events] Unknown type:", type);
      return null;
  }

  if (!userId) {
    console.warn("[events] No userId resolved for type:", type);
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, language, city")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.warn("[events] Profile fetch error:", error.message);
  }

  return {
    userId,
    name: profile?.full_name || "Utilisateur",
    firstName: (profile?.full_name || "").split(" ")[0] || "Utilisateur",
    language: profile?.language || "fr",
    city: profile?.city || null,
  };
}

// ── Vérification des préférences ──
async function shouldSendPush(supabase: any, userId: string, type: EventType) {
  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = not found
    console.warn("[events] Preference fetch error:", error.message);
  }

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
  if (key && prefs[key] === false) {
    console.log("[events] Push disabled by preference:", key);
    return false;
  }

  // Heures silencieuses
  if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const { quiet_hours_start: start, quiet_hours_end: end } = prefs;
    
    const isQuiet = start < end 
      ? current >= start && current <= end 
      : current >= start || current <= end;
    
    if (isQuiet) {
      console.log("[events] Quiet hours active for:", userId);
      return false;
    }
  }

  return true;
}

// ── Construction du message ──
function getPushMessage(type: EventType, record: any, recipient: { firstName: string; language: string }) {
  const fr = recipient.language === "fr";
  const name = recipient.firstName;
  const senderName = record._sender_name || record.sender_name || "Quelqu'un";
  const propTitle = record._property_title || record.title || "votre bien";
  const city = record._property_city || record.city || "";
  const neighborhood = record._property_neighborhood || record.neighborhood || "";
  const price = record._property_price || record.price;
  const priceFormatted = price ? `${Number(price).toLocaleString("fr-FR")} FCFA` : "";
  const image = record._property_image || record.images?.[0] || null;

  const location = [neighborhood, city].filter(Boolean).join(", ");
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
          ? `${name}, ${senderName} s'intéresse à votre bien "${propTitle}"${location ? ` à ${location}` : ""}.`
          : `${name}, ${senderName} is interested in your property "${propTitle}"${location ? ` in ${location}` : ""}.`,
        image,
      };
      break;

    case "new_review":
      result = {
        title: fr ? `⭐ Nouvel avis sur votre bien` : `⭐ New review on your property`,
        body: fr
          ? `${name}, "${propTitle}" a reçu un avis ${record.rating}/5${location ? ` à ${location}` : ""}.`
          : `${name}, "${propTitle}" received a ${record.rating}/5 review${location ? ` in ${location}` : ""}.`,
        image,
      };
      break;

    case "verification_update":
      if (record.level_2_status === "approved") {
        result = {
          title: fr ? "✅ Identité vérifiée" : "✅ Identity verified",
          body: fr
            ? `${name}, votre identité est vérifiée ! Publiez vos annonces maintenant.`
            : `${name}, your identity is verified! Start publishing now.`,
        };
      } else if (record.level_2_status === "rejected") {
        result = {
          title: fr ? "❌ Vérification refusée" : "❌ Verification rejected",
          body: fr
            ? `${name}, veuillez resoumettre vos documents.`
            : `${name}, please resubmit your documents.`,
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
          ? `${name}, "${propTitle}"${location ? ` à ${location}` : ""} : ${priceFormatted}`
          : `${name}, "${propTitle}"${location ? ` in ${location}` : ""}: ${priceFormatted}`,
        image,
      };
      break;

    case "high_views":
      result = {
        title: fr ? "🔥 Votre annonce cartonne !" : "🔥 Your listing is trending!",
        body: fr
          ? `${name}, "${propTitle}" attire les visiteurs${location ? ` à ${location}` : ""} !`
          : `${name}, "${propTitle}" is trending${location ? ` in ${location}` : ""}!`,
        image,
      };
      break;

    case "listing_expired":
      result = {
        title: fr ? "⏰ Annonce expirée" : "⏰ Listing expired",
        body: fr
          ? `${name}, "${propTitle}" a expiré. Renouvelez-la.`
          : `${name}, "${propTitle}" has expired. Renew it.`,
      };
      break;

    case "account_verified":
      result = {
        title: fr ? "✅ Compte vérifié !" : "✅ Account verified!",
        body: fr
          ? `Félicitations ${name} ! Votre compte est vérifié.`
          : `Congratulations ${name}! Your account is verified.`,
      };
      break;

    case "welcome":
      result = {
        title: fr ? "🏠 Bienvenue sur Habinex !" : "🏠 Welcome to Habinex!",
        body: fr
          ? `${name}, trouvez votre logement idéal dès maintenant !`
          : `${name}, find your ideal home now!`,
      };
      break;

    case "reengagement":
      result = {
        title: fr ? "👋 Vous nous manquez !" : "👋 We miss you!",
        body: fr
          ? `${name}, de nouvelles propriétés vous attendent${recipient.city ? ` à ${recipient.city}` : ""} !`
          : `${name}, new properties are waiting for you${recipient.city ? ` in ${recipient.city}` : ""}!`,
      };
      break;
      
    default:
      console.warn("[events] No message builder for type:", type);
  }

  return result;
}

function getUrlForEvent(type: EventType, record: any): string {
  switch (type) {
    case "new_message": 
      return `/messages?conversation=${record.conversation_id}`;
    case "new_inquiry": 
    case "new_review": 
    case "high_views": 
      return "/dashboard";
    case "verification_update": 
      return record.level_2_status === "approved" ? "/profile" : "/identity-verification";
    case "new_property": 
    case "price_drop": 
      return `/property/${record.id || record.property_id}`;
    case "account_verified": 
      return "/profile";
    default: 
      return "/";
  }
}

// ── Envoi avec retry et rate limiting ──
async function sendPushWithRetry(
  userId: string, 
  message: { title: string; body: string; image?: string }, 
  data: any,
  attempt = 0
): Promise<{ success: boolean; error?: string; details?: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(PUSH_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        userId,
        title: message.title,
        body: message.body,
        ...(message.image && { image: message.image }),
        data,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    // Vérifier si l'envoi a vraiment réussi
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    // Vérifier le contenu de la réponse
    if (result.failed > 0 && result.successful === 0) {
      throw new Error(result.details?.[0]?.error || "All pushes failed");
    }

    return { success: true, details: result };

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Retry une fois si erreur réseau
    if (attempt === 0 && (error.name === "AbortError" || error.message.includes("fetch"))) {
      console.log("[events] Retrying push for:", userId);
      await new Promise(r => setTimeout(r, 1000));
      return sendPushWithRetry(userId, message, data, attempt + 1);
    }
    
    return { success: false, error: error.message };
  }
}

// ── Handler principal ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[events] === START ===");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: WebhookPayload = await req.json();
    const { type, record: rawRecord, user_ids } = payload;

    console.log("[events] Type:", type, "user_ids:", user_ids?.length || 0);

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrichir le record
    const record = await enrichRecord(supabase, type, rawRecord);

    // Résoudre les destinataires
    let recipients: Array<{
      userId: string;
      name: string;
      firstName: string;
      language: string;
      city: string | null;
    }> = [];

    if (user_ids?.length) {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, language, city")
        .in("user_id", user_ids);
      
      if (error) {
        console.error("[events] Profiles fetch error:", error.message);
      } else if (profiles) {
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
      return new Response(
        JSON.stringify({ message: "No recipients found", type }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      
      // Rate limiting entre les envois
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      // Vérifier préférences
      const shouldSend = await shouldSendPush(supabase, r.userId, type);
      if (!shouldSend) {
        results.push({ userId: r.userId, status: "skipped", reason: "preferences" });
        continue;
      }

      // Construire le message
      const pushMessage = getPushMessage(type, record, r);
      if (!pushMessage) {
        results.push({ userId: r.userId, status: "skipped", reason: "no_message_builder" });
        continue;
      }

      console.log("[events] Sending:", pushMessage.title, "to:", r.userId);

      // Envoyer la notification
      const pushResult = await sendPushWithRetry(
        r.userId,
        pushMessage,
        {
          url: getUrlForEvent(type, record),
          type,
          contactUrl: "/messages",
          propertyTitle: record._property_title || undefined,
          city: record._property_city || undefined,
        }
      );

      results.push({
        userId: r.userId,
        status: pushResult.success ? "sent" : "error",
        details: pushResult.details || pushResult.error,
      });

      // Logger dans l'historique (fire and forget)
      try {
        await supabase.from("notification_history").insert({
          user_id: r.userId,
          notification_type: type,
          channel: "push",
          title: pushMessage.title,
          content: pushMessage.body,
          status: pushResult.success ? "sent" : "failed",
          metadata: { 
            ...record, 
            image: pushMessage.image,
            error: pushResult.error 
          },
        });
      } catch (logErr: any) {
        console.error("[events] History log error:", logErr.message);
      }
    }

    console.log("[events] === DONE ===", JSON.stringify(results));

    return new Response(
      JSON.stringify({ 
        success: true,
        type,
        recipients: recipients.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[events] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});