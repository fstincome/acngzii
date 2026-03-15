import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Find all check_in visits where expected_checkout has passed and there's no matching check_out
    const { data: expiredVisits, error: fetchError } = await supabase
      .from("visits")
      .select("*")
      .eq("action", "check_in")
      .not("expected_checkout", "is", null)
      .lt("expected_checkout", now);

    if (fetchError) throw fetchError;

    if (!expiredVisits || expiredVisits.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired visits", checked_out: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each expired check_in, verify there's no check_out after it
    let checkedOutCount = 0;
    for (const visit of expiredVisits) {
      // Check if there's already a check_out for this visitor in this room after this check_in
      const { data: existingCheckout } = await supabase
        .from("visits")
        .select("id")
        .eq("visitor_id", visit.visitor_id)
        .eq("room", visit.room)
        .eq("action", "check_out")
        .gt("timestamp", visit.timestamp)
        .limit(1);

      if (existingCheckout && existingCheckout.length > 0) {
        continue; // Already checked out
      }

      // Insert auto check_out
      const { error: insertError } = await supabase
        .from("visits")
        .insert({
          visitor_id: visit.visitor_id,
          room: visit.room,
          action: "check_out",
          timestamp: visit.expected_checkout,
        });

      if (insertError) {
        console.error(`Error checking out ${visit.visitor_id}:`, insertError);
        continue;
      }
      checkedOutCount++;
    }

    return new Response(
      JSON.stringify({ message: "Auto-checkout completed", checked_out: checkedOutCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
