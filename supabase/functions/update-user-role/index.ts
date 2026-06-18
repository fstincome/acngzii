import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = ["admin", "american_center", "american_corner_gitega", "coordinator", "program_manager"];

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
    if (!caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const {
      user_id,
      role,
      full_name,
      phone,
      national_id,
      job_title,
      department,
      hire_date,
      address,
      emergency_contact,
      photo,
    } = await req.json();

    if (!user_id) throw new Error("user_id is required");

    if (role) {
      if (!ALLOWED_ROLES.includes(role)) throw new Error("Invalid role");
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

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone || null;
    if (national_id !== undefined) updates.national_id = national_id || null;
    if (job_title !== undefined) updates.job_title = job_title || null;
    if (department !== undefined) updates.department = department || null;
    if (hire_date !== undefined) updates.hire_date = hire_date || null;
    if (address !== undefined) updates.address = address || null;
    if (emergency_contact !== undefined) updates.emergency_contact = emergency_contact || null;
    if (photo !== undefined) updates.photo = photo || null;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
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
