import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { question_id, status } = await request.json();

    const validStatuses = ["pending", "approved", "starred", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // When approving, also set ai_approved to true so it shows in the community feed
    const update: Record<string, unknown> = { moderator_status: status };
    if (status === "approved" || status === "starred") {
      update.ai_approved = true;
    }

    const { error } = await supabase
      .from("live_questions")
      .update(update)
      .eq("id", question_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
