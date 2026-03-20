import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, question_id } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();

    // Insert upvote (unique constraint prevents duplicates)
    const { error } = await supabase.from("question_upvotes").insert({
      registration_id: user.id,
      question_id,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Increment upvote count on the question
    await supabase.rpc("increment_upvote_count", { qid: question_id }).catch(async () => {
      // Fallback: manual increment
      const { data } = await supabase
        .from("live_questions")
        .select("upvote_count")
        .eq("id", question_id)
        .single();

      if (data) {
        await supabase
          .from("live_questions")
          .update({ upvote_count: (data as { upvote_count: number }).upvote_count + 1 })
          .eq("id", question_id);
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
