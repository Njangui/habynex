import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, enhancementType = "auto" } = await req.json();

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Determine enhancement prompt based on type
    const prompts: Record<string, string> = {
      auto: "Enhance this real estate property image: improve lighting, colors, sharpness, and overall visual appeal while keeping it realistic. Make it look professional and inviting.",
      brightness: "Brighten this property image, especially dark areas and shadows. Make the room look more naturally lit and welcoming.",
      contrast: "Improve the contrast of this property image. Make details sharper and more defined while maintaining natural colors.",
      vibrance: "Enhance the colors of this property image. Make them more vibrant and appealing while keeping the image realistic.",
    };

    const prompt = prompts[enhancementType] || prompts.auto;

    // Use Lovable AI to enhance the image
    const lovableResponse = await fetch("https://api.lovable.dev/v1/ai/image-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64Image}`,
        prompt,
        model: "flux.dev",
      }),
    });

    if (!lovableResponse.ok) {
      // Fallback: return original image with CSS-based enhancement hints
      console.log("AI enhancement not available, using fallback");
      
      // For now, we'll return a processed version with basic enhancements
      // In production, this would use a proper image processing library
      return new Response(
        JSON.stringify({ 
          enhancedUrl: imageUrl,
          enhanced: false,
          message: "Enhancement AI temporarily unavailable. Image kept as original."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await lovableResponse.json();

    // Upload enhanced image to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode base64 and upload
    const enhancedBase64 = result.image.replace(/^data:image\/\w+;base64,/, "");
    const enhancedBuffer = Uint8Array.from(atob(enhancedBase64), c => c.charCodeAt(0));

    const fileName = `enhanced/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, enhancedBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrl } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ 
        enhancedUrl: publicUrl.publicUrl,
        enhanced: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Enhancement error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});