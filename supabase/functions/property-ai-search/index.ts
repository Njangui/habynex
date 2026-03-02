import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client with user's auth context (respects RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Invalid authentication:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Session invalide ou expirée" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user ${user.id} requesting AI search`);

    // Fetch available properties for context (respects RLS - only published properties)
    const { data: properties } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .eq("is_available", true)
      .limit(50);

    const propertyContext = properties && properties.length > 0
      ? `Voici les propriétés disponibles dans notre base de données:\n${JSON.stringify(properties, null, 2)}`
      : "Aucune propriété n'est actuellement disponible dans la base de données.";

    const systemPrompt = `Tu es un assistant immobilier intelligent pour ImmoIA, une plateforme de location et vente immobilière au Cameroun.

Ton rôle:
- Aider les utilisateurs à trouver le logement idéal selon leurs critères (budget, localisation, type de bien, commodités)
- Comprendre les requêtes en langage naturel et les convertir en recommandations
- Fournir des informations sur les quartiers de Yaoundé, Douala et autres villes camerounaises
- Donner des conseils sur le marché immobilier local

Contexte des propriétés disponibles:
${propertyContext}

Règles:
- Réponds toujours en français
- Sois concis et utile
- Si l'utilisateur demande une propriété spécifique, essaie de la trouver dans le contexte fourni
- Suggère des alternatives si rien ne correspond exactement
- Mentionne les prix en FCFA
- Donne des informations sur les quartiers (sécurité, accessibilité, ambiance)

IMPORTANT - Format pour les recommandations de propriétés:
Quand tu recommandes des propriétés, tu DOIS inclure un bloc JSON spécial à la fin de ta réponse avec ce format exact:
\`\`\`properties
[{"id": "uuid-de-la-propriete"}, {"id": "autre-uuid"}]
\`\`\`

Le bloc \`\`\`properties doit contenir un tableau JSON avec les IDs des propriétés recommandées.
N'inclus ce bloc que si tu recommandes des propriétés spécifiques de la base de données.
Le bloc doit être à la fin de ta réponse, après ton explication textuelle.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded from AI gateway");
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Insufficient credits");
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
