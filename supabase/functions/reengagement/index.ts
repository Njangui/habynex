import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT = 20000; // 20s
const DELAY_BETWEEN_BATCHES = 500; // 500ms
const DELAY_BETWEEN_USERS = 100; // 100ms

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const inactiveDays = body.inactive_days || 7; // Par défaut 7 jours (plus réaliste)

    console.log("[reengagement] Finding users inactive for", inactiveDays, "days");

    // Calculer la date de coupure
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // 1. Récupérer les utilisateurs avec des abonnements push actifs
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Actifs dans les 90 derniers jours

    if (subError) {
      console.error("[reengagement] Subscription fetch error:", subError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions?.length) {
      console.log("[reengagement] No users with push subscriptions");
      return new Response(
        JSON.stringify({ message: "No eligible users", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extraire les user_ids uniques
    const userIds = [...new Set(subscriptions.map((s: any) => s.user_id))];
    console.log("[reengagement] Found", userIds.length, "users with push subscriptions");

    // 2. Filtrer : exclure ceux qui ont reçu un reengagement récemment
    const { data: recentNotifs, error: notifError } = await supabase
      .from("notification_history")
      .select("user_id")
      .in("user_id", userIds)
      .eq("notification_type", "reengagement")
      .gte("created_at", cutoffDate.toISOString());

    if (notifError) {
      console.error("[reengagement] History fetch error:", notifError.message);
    }

    const recentUserIds = new Set((recentNotifs || []).map((n: any) => n.user_id));
    const eligibleUserIds = userIds.filter((id: string) => !recentUserIds.has(id));

    console.log("[reengagement] After filtering:", eligibleUserIds.length, "eligible users");

    if (!eligibleUserIds.length) {
      return new Response(
        JSON.stringify({ 
          message: "All users recently notified", 
          total: userIds.length,
          recently_notified: recentUserIds.size 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Vérifier les préférences marketing (anti-spam)
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id, push_marketing")
      .in("user_id", eligibleUserIds);

    if (prefError) {
      console.error("[reengagement] Preferences fetch error:", prefError.message);
    }

    const marketingPrefs = new Map(
      (preferences || []).map((p: any) => [p.user_id, p.push_marketing !== false])
    );

    // Filtrer ceux qui ont désactivé le marketing
    const finalUserIds = eligibleUserIds.filter(id => marketingPrefs.get(id) !== false);

    console.log("[reengagement] After preference check:", finalUserIds.length, "users");

    if (!finalUserIds.length) {
      return new Response(
        JSON.stringify({ 
          message: "All users opted out of marketing notifications",
          eligible: eligibleUserIds.length 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Récupérer une propriété populaire pour le contenu
    const { data: latestProperties, error: propError } = await supabase
      .from("properties")
      .select("id, title, city, neighborhood, price, price_unit, images")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (propError) {
      console.warn("[reengagement] No properties found:", propError.message);
    }

    const popularProperty = latestProperties || null;

    // 5. Envoyer les notifications par batches
    const results = [];
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    for (let i = 0; i < finalUserIds.length; i += BATCH_SIZE) {
      const batch = finalUserIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(finalUserIds.length / BATCH_SIZE);

      console.log(`[reengagement] Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);

      const batchResults = [];

      // Traiter chaque utilisateur individuellement (pas de Promise.all pour éviter la surcharge)
      for (const userId of batch) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/handle-events`, // ✅ CORRECTION : handle-events
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                type: "reengagement",
                record: {
                  id: popularProperty?.id,
                  title: popularProperty?.title,
                  city: popularProperty?.city,
                  neighborhood: popularProperty?.neighborhood,
                  price: popularProperty?.price,
                  price_unit: popularProperty?.price_unit,
                  images: popularProperty?.images,
                  // Champs enrichis pour handle-events
                  _property_title: popularProperty?.title,
                  _property_city: popularProperty?.city,
                  _property_neighborhood: popularProperty?.neighborhood,
                  _property_image: popularProperty?.images?.[0],
                  _property_price: popularProperty?.price,
                  _property_price_unit: popularProperty?.price_unit,
                },
                user_ids: [userId], // Envoi individuel pour meilleure gestion d'erreur
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          batchResults.push({ userId, status: "sent", result });

        } catch (err: any) {
          clearTimeout(timeoutId);
          console.error(`[reengagement] Failed for ${userId}:`, err.message);
          batchResults.push({ userId, status: "error", error: err.message });
        }

        // Rate limiting entre utilisateurs
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_USERS));
      }

      results.push({
        batch: batchNum,
        totalBatches,
        processed: batch.length,
        successful: batchResults.filter(r => r.status === "sent").length,
        failed: batchResults.filter(r => r.status === "error").length,
        details: batchResults,
      });

      // Délai entre les batches
      if (i + BATCH_SIZE < finalUserIds.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
      }
    }

    // Résumé final
    const summary = {
      total_processed: finalUserIds.length,
      total_successful: results.reduce((acc, r) => acc + r.successful, 0),
      total_failed: results.reduce((acc, r) => acc + r.failed, 0),
      batches: results.length,
    };

    console.log("[reengagement] Complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        ...summary,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[reengagement] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});