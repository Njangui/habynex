import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const BATCH_SIZE = 10;
const DELAY_BETWEEN_USERS = 100; // ms
const REQUEST_TIMEOUT = 15000; // 15s

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[matching] Starting property matching job");

    // Récupérer les annonces publiées dans la dernière heure
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: newProperties, error: propError } = await supabase
      .from("properties")
      .select("id, title, city, neighborhood, price, price_unit, property_type, images")
      .eq("is_published", true)
      .eq("is_available", true)
      .gte("created_at", oneHourAgo);

    if (propError) {
      console.error("[matching] Property fetch error:", propError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch properties" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newProperties || newProperties.length === 0) {
      console.log("[matching] No new properties in the last hour");
      return new Response(
        JSON.stringify({ message: "No new properties", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[matching] Found ${newProperties.length} new properties`);

    // Récupérer tous les chercheurs avec leurs préférences
    const { data: seekers, error: seekerError } = await supabase
      .from("profiles")
      .select(`
        user_id, 
        city, 
        preferred_property_types, 
        budget_min, 
        budget_max, 
        language,
        notification_preferences!inner (
          push_recommendations,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end
        )
      `)
      .eq("user_type", "seeker")
      .eq("notification_preferences.push_recommendations", true); // Filtrer directement

    if (seekerError) {
      console.error("[matching] Seeker fetch error:", seekerError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch seekers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!seekers || seekers.length === 0) {
      console.log("[matching] No seekers with push recommendations enabled");
      return new Response(
        JSON.stringify({ message: "No eligible seekers", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[matching] Processing ${seekers.length} seekers`);

    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Traiter par batches pour éviter la surcharge
    for (let i = 0; i < seekers.length; i += BATCH_SIZE) {
      const batch = seekers.slice(i, i + BATCH_SIZE);
      
      for (const seeker of batch) {
        try {
          // Vérifier les heures silencieuses
          const prefs = seeker.notification_preferences;
          if (prefs?.quiet_hours_enabled && prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const { quiet_hours_start: start, quiet_hours_end: end } = prefs;
            
            const isQuiet = start < end 
              ? currentTime >= start && currentTime <= end 
              : currentTime >= start || currentTime <= end;
            
            if (isQuiet) {
              console.log(`[matching] Quiet hours for ${seeker.user_id}: ${currentTime} (${start}-${end})`);
              skipCount++;
              results.push({ userId: seeker.user_id, status: "skipped", reason: "quiet_hours" });
              continue;
            }
          }

          // Trouver les correspondances
          const matches = newProperties.filter((prop) => {
            // Ville (si définie)
            if (seeker.city && prop.city && prop.city.toLowerCase() !== seeker.city.toLowerCase()) {
              return false;
            }
            
            // Budget max
            if (seeker.budget_max && prop.price > seeker.budget_max) {
              return false;
            }
            
            // Budget min (optionnel)
            if (seeker.budget_min && prop.price < seeker.budget_min) {
              return false;
            }
            
            // Type de propriété préféré
            if (seeker.preferred_property_types?.length > 0) {
              const types = Array.isArray(seeker.preferred_property_types) 
                ? seeker.preferred_property_types 
                : [seeker.preferred_property_types];
              
              if (!types.includes(prop.property_type)) {
                return false;
              }
            }
            
            return true;
          });

          if (matches.length === 0) {
            skipCount++;
            results.push({ userId: seeker.user_id, status: "skipped", reason: "no_matches" });
            continue;
          }

          // Construire le message
          const lang = seeker.language || "fr";
          const isSingle = matches.length === 1;
          
          let title, body, propertyData;
          
          if (lang === "fr") {
            title = isSingle 
              ? `🏠 Nouveau bien à ${matches[0].city || "votre ville"}`
              : `🏠 ${matches.length} nouveaux biens correspondent`;
            
            body = isSingle
              ? `${matches[0].title} - ${matches[0].price.toLocaleString("fr-FR")} FCFA`
              : `${matches.map(m => m.title).join(", ").substring(0, 80)}${matches.length > 1 ? '...' : ''}`;
          } else {
            title = isSingle 
              ? `🏠 New property in ${matches[0].city || "your city"}`
              : `🏠 ${matches.length} new matching properties`;
            
            body = isSingle
              ? `${matches[0].title} - ${matches[0].price.toLocaleString("en-US")} FCFA`
              : `${matches.map(m => m.title).join(", ").substring(0, 80)}${matches.length > 1 ? '...' : ''}`;
          }

          // Préparer les données enrichies pour handle-events
          const bestMatch = matches[0];
          propertyData = {
            id: bestMatch.id,
            title: bestMatch.title,
            city: bestMatch.city,
            neighborhood: bestMatch.neighborhood,
            price: bestMatch.price,
            price_unit: bestMatch.price_unit,
            property_type: bestMatch.property_type,
            images: bestMatch.images,
            match_count: matches.length,
            // Champs enrichis pour le template
            _property_title: bestMatch.title,
            _property_city: bestMatch.city,
            _property_neighborhood: bestMatch.neighborhood,
            _property_price: bestMatch.price,
            _property_price_unit: bestMatch.price_unit,
            _property_image: bestMatch.images?.[0],
          };

          // Envoyer via handle-events (pas directement push-notify)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

          try {
            const response = await fetch(
              `${supabaseUrl}/functions/v1/handle-events`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                  type: "new_property", // ou "saved_search_match" pour plus spécifique
                  record: propertyData,
                  user_ids: [seeker.user_id], // Envoi individuel pour meilleure traçabilité
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
            successCount++;
            results.push({ 
              userId: seeker.user_id, 
              status: "sent", 
              matches: matches.length,
              result 
            });

          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            throw fetchError;
          }

        } catch (error: any) {
          console.error(`[matching] Failed for ${seeker.user_id}:`, error.message);
          errorCount++;
          results.push({ 
            userId: seeker.user_id, 
            status: "error", 
            error: error.message 
          });
        }

        // Rate limiting entre utilisateurs
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_USERS));
      }

      // Pause entre batches
      if (i + BATCH_SIZE < seekers.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const summary = {
      total: seekers.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      new_properties: newProperties.length,
    };

    console.log("[matching] Complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        ...summary,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[matching] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});