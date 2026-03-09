import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export const supabaseAdmin = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  return createClient(supabaseUrl, serviceRoleKey);
};

