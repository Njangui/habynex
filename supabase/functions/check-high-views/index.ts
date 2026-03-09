import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VIEW_THRESHOLD = 50;
const MILESTONES = [50, 100, 200, 500, 1000, 2500, 5000, 10000];
const DELAY_BETWEEN_NOTIFICATIONS = 200; // ms

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[high-views] Starting high views check");

    // Récupérer les propriétés avec vues >= seuil
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        view_count,
        owner_id,
        city,
        neighborhood
      `)
      .gte("view_count", VIEW_THRESHOLD)
      .eq("is_published", true)
      .order("view_count", { ascending: false });

    if (propError) {
      console.error("[high-views] Property fetch error:", propError.message);
      throw propError;
    }

    if (!properties || properties.length === 0) {
      console.log("[high-views] No properties above threshold");
      return new Response(
        JSON.stringify({ message: "No properties to notify", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[high-views] Checking ${properties.length} properties`);

    const notifications: any[] = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const property of properties) {
      try {
        const currentViews = property.view_count || 0;
        
        // Déterminer le milestone actuel
        const currentMilestone = MILESTONES.reduce((prev, curr) => 
          currentViews >= curr ? curr : prev, 0
        );

        if (currentMilestone === 0) {
          skipCount++;
          continue;
        }

        // Vérifier si déjà notifié pour ce milestone
        const { data: alreadySent, error: checkError } = await supabase
          .from("view_milestone_notifications")
          .select("id")
          .eq("property_id", property.id)
          .eq("milestone", currentMilestone)
          .maybeSingle();

        if (checkError) {
          console.error(`[high-views] Check error for ${property.id}:`, checkError.message);
        }

        if (alreadySent) {
          console.log(`[high-views] Already notified: ${property.id} @ ${currentMilestone}`);
          skipCount++;
          continue;
        }

        // Récupérer le profil du propriétaire avec préférences
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(`
            full_name, 
            user_id,
            language,
            notification_preferences!inner (
              email_property_views,
              push_high_views,
              quiet_hours_enabled,
              quiet_hours_start,
              quiet_hours_end
            )
          `)
          .eq("user_id", property.owner_id)
          .single();

        if (profileError || !profile) {
          console.warn(`[high-views] Profile not found: ${property.owner_id}`);
          skipCount++;
          continue;
        }

        const prefs = profile.notification_preferences;

        // Vérifier si les notifications de vues sont activées
        if (prefs?.email_property_views === false && prefs?.push_high_views === false) {
          console.log(`[high-views] Disabled by preferences: ${property.owner_id}`);
          skipCount++;
          continue;
        }

        // Vérifier les heures silencieuses
        if (prefs?.quiet_hours_enabled && prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const { quiet_hours_start: start, quiet_hours_end: end } = prefs;
          
          const isQuiet = start < end 
            ? currentTime >= start && currentTime <= end 
            : currentTime >= start || currentTime <= end;
          
          if (isQuiet) {
            console.log(`[high-views] Quiet hours: ${property.owner_id}`);
            skipCount++;
            continue;
          }
        }

        // Récupérer l'email du propriétaire
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
          property.owner_id
        );

        if (authError || !authUser.user?.email) {
          console.warn(`[high-views] Email not found: ${property.owner_id}`);
          skipCount++;
          continue;
        }

        const isFr = profile.language !== "en";
        const location = [property.neighborhood, property.city].filter(Boolean).join(", ");

        // Préparer les données enrichies
        const enrichedData = {
          id: property.id,
          title: property.title,
          city: property.city,
          neighborhood: property.neighborhood,
          viewCount: currentViews,
          milestone: currentMilestone,
          // Champs enrichis pour les templates
          _property_title: property.title,
          _property_city: property.city,
          _property_neighborhood: property.neighborhood,
          recipientName: profile.full_name || (isFr ? "Propriétaire" : "Owner"),
        };

        const notificationsSent = [];

        // Envoi Email (si activé)
        if (prefs?.email_property_views !== false) {
          try {
            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-email`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  type: "high_views",
                  recipientId: property.owner_id,
                  recipientEmail: authUser.user.email,
                  recipientName: profile.full_name,
                  language: profile.language,
                  data: enrichedData,
                }),
              }
            );

            if (emailResponse.ok) {
              notificationsSent.push("email");
            } else {
              console.warn(`[high-views] Email failed: ${property.id}`);
            }
          } catch (emailError) {
            console.error(`[high-views] Email error: ${property.id}`, emailError.message);
          }
        }

        // Envoi Push (si activé)
        if (prefs?.push_high_views !== false) {
          try {
            const pushResponse = await fetch(
              `${supabaseUrl}/functions/v1/handle-events`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  type: "high_views",
                  record: enrichedData,
                  user_ids: [property.owner_id],
                }),
              }
            );

            if (pushResponse.ok) {
              notificationsSent.push("push");
            } else {
              console.warn(`[high-views] Push failed: ${property.id}`);
            }
          } catch (pushError) {
            console.error(`[high-views] Push error: ${property.id}`, pushError.message);
          }
        }

        // Marquer comme notifié
        if (notificationsSent.length > 0) {
          const { error: insertError } = await supabase
            .from("view_milestone_notifications")
            .insert({
              property_id: property.id,
              owner_id: property.owner_id,
              milestone: currentMilestone,
              view_count: currentViews,
              channels: notificationsSent,
              sent_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[high-views] Failed to log: ${property.id}`, insertError.message);
          }

          successCount++;
          notifications.push({
            propertyId: property.id,
            ownerId: property.owner_id,
            milestone: currentMilestone,
            viewCount: currentViews,
            channels: notificationsSent,
            location,
          });

          console.log(`[high-views] Notified: ${property.title} @ ${currentMilestone} views`);
        }

      } catch (propertyError: any) {
        console.error(`[high-views] Error for property ${property.id}:`, propertyError.message);
        errorCount++;
        notifications.push({
          propertyId: property.id,
          error: propertyError.message,
        });
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_NOTIFICATIONS));
    }

    const summary = {
      total: properties.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
    };

    console.log("[high-views] Complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        ...summary,
        notifications,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[high-views] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});