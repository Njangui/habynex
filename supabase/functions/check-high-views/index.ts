import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VIEW_THRESHOLD = 50; // Notify when property reaches this many views

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get properties that have crossed the view threshold
    // and haven't been notified yet (we track this with a simple modulo check)
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        view_count,
        owner_id
      `)
      .gte("view_count", VIEW_THRESHOLD)
      .eq("is_published", true);

    if (propError) {
      throw propError;
    }

    const notifications: any[] = [];

    for (const property of properties || []) {
      // Only notify at specific milestones (50, 100, 200, 500, 1000)
      const milestones = [50, 100, 200, 500, 1000];
      const currentViews = property.view_count || 0;
      
      const milestone = milestones.find(m => 
        currentViews >= m && currentViews < m + 10
      );
      
      if (!milestone) continue;

      // Get owner profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, user_id")
        .eq("user_id", property.owner_id)
        .single();

      if (profileError || !profile) continue;

      // Get owner email from auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
        property.owner_id
      );

      if (authError || !authUser.user?.email) continue;

      // Send notification
      const notificationPayload = {
        type: "high_views",
        recipientEmail: authUser.user.email,
        recipientName: profile.full_name || "Propriétaire",
        data: {
          propertyTitle: property.title,
          viewCount: currentViews,
        },
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (response.ok) {
        notifications.push({
          propertyId: property.id,
          milestone,
          sent: true,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        notifications 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error checking high views:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
