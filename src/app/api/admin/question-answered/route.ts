import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { question_id } = await request.json();

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("live_questions")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", question_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
