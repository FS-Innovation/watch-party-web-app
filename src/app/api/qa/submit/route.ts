import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken, getActiveSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, question } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!question || question.length > 300) {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }

    const session = await getActiveSession();
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 400 });

    const supabase = createServerClient();

    // AI filtering
    let aiApproved = true;
    let aiTopic: string | null = null;

    try {
      const filterRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}api/ai/filter-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }).catch(() => null);

      if (filterRes?.ok) {
        const filterData = await filterRes.json();
        aiApproved = filterData.approved;
        aiTopic = filterData.topic;
      }
    } catch {
      // AI filtering failed — default to approved, moderator will review
      aiApproved = true;
    }

    const { error } = await supabase.from("live_questions").insert({
      registration_id: user.id,
      session_id: session.id,
      question,
      ai_approved: aiApproved,
      moderator_status: "pending",
      ai_topic: aiTopic,
      ai_duplicate_of: null,
      answered_at: null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
