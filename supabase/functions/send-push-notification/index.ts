import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[push] VAPID keys missing");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(
      "mailto:contact.habynex@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: PushPayload = await req.json();
    const {
      userId,
      title,
      body: messageBody,
      icon = "/icon-192x192.png",
      badge = "/badge-72x72.png",
      image,
      url = "/",
      data = {},
      actions = [],
    } = body;

    console.log("[push] Request:", { userId, title, hasImage: !!image });

    if (!userId || !title || !messageBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer les abonnements
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      console.error("[push] DB error:", subError);
      return new Response(
        JSON.stringify({ error: "Database error", details: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[push] No subscriptions for user:", userId);
      return new Response(
        JSON.stringify({ message: "No subscriptions found", userId, successful: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construire le payload
    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon,
      badge,
      ...(image && { image }), // Conditionnel
      url,
      actions,
      data: {
        ...data,
        url,
        timestamp: new Date().toISOString(),
      },
    });

    // Envoyer à tous les appareils
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          const result = await webpush.sendNotification(pushSubscription, payload);
          
          console.log("[push] Success:", sub.endpoint.slice(-30), "status:", result.statusCode);
          
          return { 
            success: true, 
            endpoint: sub.endpoint,
            statusCode: result.statusCode 
          };

        } catch (error: any) {
          console.error("[push] Failed:", sub.endpoint.slice(-30), "error:", error.message);

          // Nettoyer les tokens expirés (CRITIQUE)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log("[push] Removing expired token:", sub.id);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            
            return { 
              success: false, 
              endpoint: sub.endpoint, 
              removed: true, 
              reason: "expired",
              statusCode: error.statusCode 
            };
          }

          return { 
            success: false, 
            endpoint: sub.endpoint, 
            error: error.message,
            statusCode: error.statusCode 
          };
        }
      })
    );

    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === "fulfilled" && (r.value as any).success).length,
      failed: results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as any).success)).length,
      removed: results.filter(r => r.status === "fulfilled" && (r.value as any).removed).length,
      details: results.map(r => 
        r.status === "fulfilled" ? r.value : { error: r.reason?.message }
      ),
    };

    console.log("[push] Summary:", summary);

    // Retourner 200 même si partiel, mais avec détails
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[push] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});