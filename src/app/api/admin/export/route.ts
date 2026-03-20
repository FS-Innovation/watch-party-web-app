import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const [
      session,
      attendees,
      pollQuestions,
      pollResponses,
      questions,
      cardResponses,
      photos,
      moments,
      communityPoll,
    ] = await Promise.all([
      supabase.from("watch_party_sessions").select("*").eq("id", sessionId).single(),
      supabase.from("attendance_signals").select("*, registrations(first_name, last_name, email, location)").eq("session_id", sessionId),
      supabase.from("poll_questions").select("*").eq("session_id", sessionId),
      supabase.from("poll_responses").select("*, registrations(first_name, last_name, email)"),
      supabase.from("live_questions").select("*, registrations(first_name, last_name, email)").eq("session_id", sessionId),
      supabase.from("conversation_card_responses").select("*, registrations(first_name, last_name), conversation_cards(prompt_text)"),
      supabase.from("photobooth_entries").select("*").eq("session_id", sessionId),
      supabase.from("moment_captures").select("*, registrations(first_name, last_name)").eq("session_id", sessionId),
      supabase.from("community_poll_responses").select("*, registrations(first_name, last_name)").eq("session_id", sessionId),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      session: session.data,
      attendees: attendees.data,
      polls: {
        questions: pollQuestions.data,
        responses: pollResponses.data,
      },
      live_questions: questions.data,
      conversation_cards: cardResponses.data,
      photobooth: photos.data,
      moment_captures: moments.data,
      community_poll: communityPoll.data,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="btd-export-${sessionId}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
