import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  otp?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = (await req.json()) as SMSRequest;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const username = Deno.env.get("AFRICASTALKING_USERNAME");

    if (!apiKey || !username) {
      console.error("Africa's Talking credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP if not provided
    const otpCode = otp || Math.floor(100000 + Math.random() * 900000).toString();

    const message = `Votre code de vérification ImmoIA est: ${otpCode}. Il expire dans 10 minutes.`;

    // Format phone number for Africa's Talking
    let formattedPhone = phone;
    if (!phone.startsWith("+")) {
      formattedPhone = `+${phone}`;
    }

    // Send SMS via Africa's Talking
    const apiUrl = username === "sandbox" 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("to", formattedPhone);
    formData.append("message", message);
    formData.append("from", "ImmoIA");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Africa's Talking error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SMS sent successfully:", result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        otp: otpCode,
        message: "OTP sent successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-sms-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
