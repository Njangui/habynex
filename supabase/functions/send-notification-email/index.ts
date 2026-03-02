import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_message" | "high_views";
  recipientId?: string;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  propertyTitle?: string;
  messagePreview?: string;
  viewCount?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    const { type, recipientId, senderName, propertyTitle, messagePreview, viewCount } = body;
    let { recipientEmail, recipientName } = body;

    // If recipientId is provided, fetch email and name
    if (recipientId && !recipientEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(recipientId);
      recipientEmail = authUser?.user?.email;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", recipientId)
        .single();
      
      recipientName = profile?.full_name || "Utilisateur";
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let html: string;

    if (type === "new_message") {
      subject = `💬 Nouveau message pour "${propertyTitle}"`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Habynex</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${recipientName} !</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Vous avez reçu un nouveau message de <strong>${senderName}</strong> concernant votre annonce :
              </p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #1f2937; font-weight: 600; margin: 0 0 5px 0;">📍 ${propertyTitle}</p>
              </div>
              <div style="background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="color: #1e40af; margin: 0; font-style: italic;">"${messagePreview?.substring(0, 150)}${messagePreview && messagePreview.length > 150 ? '...' : ''}"</p>
              </div>
              <a href="https://Habynex.com/messages" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; margin-top: 10px;">Répondre au message</a>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2024 Habynex. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `🔥 Votre annonce "${propertyTitle}" est populaire !`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Habynex</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1f2937; margin-top: 0;">Félicitations ${recipientName} ! 🎉</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Votre annonce attire beaucoup d'attention !
              </p>
              <div style="background: #fef3c7; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
                <p style="color: #92400e; font-size: 48px; font-weight: 700; margin: 0;">${viewCount}</p>
                <p style="color: #b45309; font-weight: 600; margin: 5px 0 0 0;">vues totales</p>
              </div>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #1f2937; font-weight: 600; margin: 0;">📍 ${propertyTitle}</p>
              </div>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                Continuez ainsi ! Plus votre annonce est vue, plus vous avez de chances de trouver le locataire ou l'acheteur idéal.
              </p>
              <a href="https://Habynex.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; margin-top: 10px;">Voir mes statistiques</a>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2024 Habynex. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Habynex <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
