import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, poll_id, answer } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();

    const { error } = await supabase.from("poll_responses").upsert(
      {
        registration_id: user.id,
        poll_id,
        answer,
      },
      { onConflict: "registration_id,poll_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Update engagement
    try {
      await supabase.rpc("increment_interactions", { rid: user.id });
    } catch {
      // RPC may not exist yet
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
