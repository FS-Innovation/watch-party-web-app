import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken, getActiveSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, response } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!response || response.length > 500) {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    const session = await getActiveSession();
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 400 });

    const supabase = createServerClient();

    const { error } = await supabase.from("moment_captures").upsert(
      {
        registration_id: user.id,
        session_id: session.id,
        response,
        ai_theme: null,
      },
      { onConflict: "registration_id,session_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
