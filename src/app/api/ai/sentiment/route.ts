import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ summary: "AI sentiment analysis requires an API key to be configured." });
    }

    const supabase = createServerClient();

    // Gather recent data
    const [questions, cardResponses, moments] = await Promise.all([
      supabase
        .from("live_questions")
        .select("question")
        .eq("session_id", sessionId)
        .order("submitted_at", { ascending: false })
        .limit(20),
      supabase
        .from("conversation_card_responses")
        .select("answer_text")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("moment_captures")
        .select("response")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const recentQuestions = (questions.data || []).map((q: { question: string }) => q.question);
    const recentCards = (cardResponses.data || []).map((c: { answer_text: string }) => c.answer_text);
    const recentMoments = (moments.data || []).map((m: { response: string }) => m.response);

    if (recentQuestions.length === 0 && recentCards.length === 0 && recentMoments.length === 0) {
      return NextResponse.json({ summary: "Waiting for community engagement data..." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are analyzing live community engagement data from a private screening event. Give a brief, warm summary (2-3 sentences) of the community mood, key themes, and what's resonating.

Recent questions asked:
${recentQuestions.join("\n") || "None yet"}

Conversation card answers:
${recentCards.join("\n") || "None yet"}

Moment capture takeaways:
${recentMoments.join("\n") || "None yet"}

Write a brief pulse summary for the host's team:`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ summary: "Unable to generate sentiment analysis right now." });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || "Processing...";

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ summary: "Sentiment analysis temporarily unavailable." });
  }
}
