import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { session_id, type } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Gather all event data
    const [
      attendees,
      pollQuestions,
      pollResponses,
      questions,
      cardResponses,
      moments,
      communityPoll,
    ] = await Promise.all([
      supabase.from("attendance_signals").select("*, registrations(first_name, location)").eq("session_id", session_id),
      supabase.from("poll_questions").select("*").eq("session_id", session_id),
      supabase.from("poll_responses").select("*, registrations(first_name)"),
      supabase.from("live_questions").select("*, registrations(first_name)").eq("session_id", session_id),
      supabase.from("conversation_card_responses").select("*, registrations(first_name), conversation_cards(prompt_text)"),
      supabase.from("moment_captures").select("*, registrations(first_name)").eq("session_id", session_id),
      supabase.from("community_poll_responses").select("response").eq("session_id", session_id),
    ]);

    const eventData = JSON.stringify({
      attendees: (attendees.data || []).length,
      polls: {
        questions: pollQuestions.data,
        total_responses: (pollResponses.data || []).length,
      },
      questions_asked: (questions.data || []).length,
      card_responses: (cardResponses.data || []).map((c: Record<string, unknown>) => c.answer_text),
      takeaways: (moments.data || []).map((m: Record<string, unknown>) => m.response),
      community_interest: communityPoll.data,
    });

    let prompt = "";

    if (type === "segments") {
      prompt = `Analyze this screening event data and create community segments. For each attendee pattern you identify, create a segment with: name, description, size estimate, and key characteristics.

Event data:
${eventData}

Output as JSON array of segments.`;
    } else if (type === "editorial") {
      prompt = `Create a 1-page editorial brief from this screening event data. Include: what moments got highest engagement, top takeaway themes, what people came for vs what they left talking about, and recommended changes for next event.

Event data:
${eventData}

Write in a clear, actionable format for the production team.`;
    } else {
      return NextResponse.json({ error: "Invalid type. Use 'segments' or 'editorial'." }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `AI request failed: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || "";

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
