import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non authentifié");

    const { data: callerRole } = await supabaseAdmin.rpc("get_user_role", { _user_id: caller.id });
    if (callerRole !== "admin") throw new Error("Non autorisé");

    const { user_id, role, full_name } = await req.json();

    if (!user_id) throw new Error("user_id requis");

    // Update role if provided
    if (role) {
      // Upsert role
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id, role });
        if (error) throw error;
      }
    }

    // Update profile name if provided
    if (full_name !== undefined) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ full_name })
        .eq("id", user_id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
