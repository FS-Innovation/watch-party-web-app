import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("poll_questions")
      .update({ triggered_at: new Date().toISOString() })
      .eq("session_id", session_id)
      .is("triggered_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
