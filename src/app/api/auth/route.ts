import { NextRequest, NextResponse } from "next/server";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_USER = {
  id: "demo-user-001",
  first_name: "Samantha",
  last_name: "Demo",
  email: "samantha@demo.com",
  phone: "+1234567890",
  location: "Los Angeles, CA",
  magic_token: "demo-token",
  ticket_number: 847,
  avatar_url: null,
  created_at: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const { magic_token } = await request.json();

    if (!magic_token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({ user: DEMO_USER });
    }

    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = createServerClient();

    const { data: user, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("magic_token", magic_token)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Record attendance
    const { data: sessions } = await supabase
      .from("watch_party_sessions")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const sessionId = sessions[0].id;

      await supabase.from("attendance_signals").upsert(
        {
          registration_id: user.id,
          session_id: sessionId,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          total_interactions: 0,
          engagement_score: 0,
        },
        { onConflict: "registration_id,session_id" }
      );

      // Increment attendee count
      try {
        await supabase.rpc("increment_attendee_count", { sid: sessionId });
      } catch {
        // RPC may not exist yet, safe to ignore
      }
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
