import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authorized");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authorized");

    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) throw new Error("Accès réservé aux administrateurs");

    // Export all tables
    const tables = [
      "visitors",
      "visits",
      "programs",
      "sub_programs",
      "program_participants",
      "program_sessions",
      "program_attendance",
      "profiles",
      "user_roles",
    ];

    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        backup[table] = { error: error.message } as any;
      } else {
        backup[table] = data || [];
      }
    }

    const result = {
      exported_at: new Date().toISOString(),
      tables: backup,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
