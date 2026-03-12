import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in Bujumbura timezone (CAT = UTC+2)
    const now = new Date();
    const bujumburaOffset = 2 * 60; // minutes
    const bujumburaTime = new Date(now.getTime() + (bujumburaOffset + now.getTimezoneOffset()) * 60000);
    const today = bujumburaTime.toISOString().split("T")[0];

    // Find all sessions for today
    const { data: sessions, error: sessError } = await supabase
      .from("program_sessions")
      .select("id")
      .eq("session_date", today);

    if (sessError) throw sessError;

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: "No sessions today", updated: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionIds = sessions.map((s: any) => s.id);

    // Update all "en_attente" records for today's sessions to "absent"
    const { data, error } = await supabase
      .from("program_attendance")
      .update({ status: "absent" })
      .in("session_id", sessionIds)
      .eq("status", "en_attente")
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "Cron job completed", updated: data?.length ?? 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
