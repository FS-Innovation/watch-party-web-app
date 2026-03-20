import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, card_id, answer_text, visibility } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!answer_text || answer_text.length > 300) {
      return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from("conversation_card_responses").upsert(
      {
        registration_id: user.id,
        card_id,
        answer_text,
        visibility: visibility || "anonymous",
      },
      { onConflict: "registration_id,card_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
