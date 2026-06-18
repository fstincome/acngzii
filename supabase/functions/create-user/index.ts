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
      email,
      password,
      full_name,
      role,
      phone,
      national_id,
      job_title,
      department,
      hire_date,
      address,
      emergency_contact,
      photo,
    } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error("Email, password, full name and role are required");
    }
    if (!ALLOWED_ROLES.includes(role)) throw new Error("Invalid role");

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr) throw createErr;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });
    if (roleErr) throw roleErr;

    // Upsert extended staff profile fields
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        phone: phone || null,
        national_id: national_id || null,
        job_title: job_title || null,
        department: department || null,
        hire_date: hire_date || null,
        address: address || null,
        emergency_contact: emergency_contact || null,
        photo: photo || null,
      })
      .eq("id", newUser.user.id);
    if (profErr) throw profErr;

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
