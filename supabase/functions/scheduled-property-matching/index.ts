import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Récupérer les annonces publiées dans la dernière heure
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: newProperties } = await supabase
    .from("properties")
    .select("id, title, city, price, property_type")
    .eq("is_published", true)
    .eq("is_available", true)
    .gte("created_at", oneHourAgo);

  if (!newProperties || newProperties.length === 0) {
    return new Response("No new properties", { status: 200 });
  }

  // Récupérer tous les chercheurs (user_type = 'seeker')
  const { data: seekers } = await supabase
    .from("profiles")
    .select("user_id, city, preferred_property_types, budget_min, budget_max, language")
    .eq("user_type", "seeker");

  if (!seekers || seekers.length === 0) {
    return new Response("No seekers", { status: 200 });
  }

  // Pour chaque chercheur, trouver les correspondances
  for (const seeker of seekers) {
    const matches = newProperties.filter((prop) => {
      if (seeker.city && prop.city !== seeker.city) return false;
      if (seeker.budget_max && prop.price > seeker.budget_max) return false;
      if (
        seeker.preferred_property_types?.length > 0 &&
        !seeker.preferred_property_types.includes(prop.property_type)
      ) {
        return false;
      }
      return true;
    });

    if (matches.length === 0) continue;

    // Construire le message selon la langue du chercheur
    const lang = seeker.language || "fr";
    let title, body;

    if (lang === "fr") {
      title = `🏠 ${matches.length} nouveau(x) bien(s) correspondant(s)`;
      body = matches.map((m) => m.title).join(", ").substring(0, 100);
    } else {
      title = `🏠 ${matches.length} new matching property(ies)`;
      body = matches.map((m) => m.title).join(", ").substring(0, 100);
    }

    // Envoyer la notification push
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        userId: seeker.user_id,
        title,
        body,
        data: { url: "/search", type: "matching_properties" },
      }),
    });
  }

  return new Response("Matching completed", { status: 200 });
});