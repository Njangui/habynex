import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Marketing reengagement notifications for inactive users
// Call this function via a cron job or manually
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const inactiveDays = body.inactive_days || 2;

    console.log("[reengagement] Finding users inactive for", inactiveDays, "days");

    // Find users with push tokens who haven't had notifications recently
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Get users who have push tokens
    const { data: tokenUsers, error: tokenErr } = await supabase
      .from("user_push_tokens")
      .select("user_id")
      .not("subscription", "is", null);

    if (tokenErr || !tokenUsers?.length) {
      console.log("[reengagement] No users with push tokens");
      return new Response(JSON.stringify({ message: "No eligible users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(tokenUsers.map((t: any) => t.user_id))];

    // Filter: users who haven't received a reengagement in the last 2 days
    const { data: recentNotifs } = await supabase
      .from("notification_history")
      .select("user_id")
      .in("user_id", userIds)
      .eq("notification_type", "reengagement")
      .gte("sent_at", cutoffDate.toISOString());

    const recentUserIds = new Set((recentNotifs || []).map((n: any) => n.user_id));
    const eligibleUserIds = userIds.filter((id: string) => !recentUserIds.has(id));

    if (!eligibleUserIds.length) {
      console.log("[reengagement] All users recently notified");
      return new Response(JSON.stringify({ message: "All users recently notified" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[reengagement] Sending to", eligibleUserIds.length, "users");

    // Get latest properties for personalized content
    const { data: latestProperties } = await supabase
      .from("properties")
      .select("id, title, city, price, images")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(5);

    const popularProperty = latestProperties?.[0];

    // Send reengagement notifications via push-notify-events
    const results = [];
    
    // Process in batches of 10
    for (let i = 0; i < eligibleUserIds.length; i += 10) {
      const batch = eligibleUserIds.slice(i, i + 10);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notify-events`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "reengagement",
              record: {
                ...(popularProperty || {}),
                _property_title: popularProperty?.title,
                _property_city: popularProperty?.city,
                _property_image: popularProperty?.images?.[0],
              },
              user_ids: batch,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        const result = await response.json();
        results.push({ batch: i / 10, status: "sent", count: batch.length, result });
      } catch (err: any) {
        clearTimeout(timeout);
        results.push({ batch: i / 10, status: "error", error: err.message });
      }
    }

    console.log("[reengagement] Done:", JSON.stringify(results));

    return new Response(JSON.stringify({ sent: eligibleUserIds.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[reengagement] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
