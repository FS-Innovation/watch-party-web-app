import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { session_id, phase } = await request.json();

    const validPhases = ["pre-screening", "part-1", "half-time", "part-2", "post-screening"];
    if (!validPhases.includes(phase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const update: Record<string, string> = { current_phase: phase };
    if (phase === "part-1") {
      update.started_at = new Date().toISOString();
    }
    if (phase === "post-screening") {
      update.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("watch_party_sessions")
      .update(update)
      .eq("id", session_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, phase });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
