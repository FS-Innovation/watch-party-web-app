import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No API key — approve by default, let moderator handle
      return NextResponse.json({ approved: true, topic: null });
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
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `You are a content moderator for a live Q&A during a private screening event. Analyze this audience question and respond with JSON only.

Question: "${question}"

Respond with exactly this JSON format:
{"approved": true/false, "topic": "brief topic tag", "reason": "one sentence"}

Approve if the question is:
- Genuine and respectful
- Related to the screening, the content, or the host
- Appropriate for a live audience

Reject if the question is:
- Spam, inappropriate, or offensive
- Not a real question
- Contains personal attacks or sensitive content

JSON response:`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ approved: true, topic: null });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          approved: result.approved !== false,
          topic: result.topic || null,
        });
      }
    } catch {
      // Parse failed — approve by default
    }

    return NextResponse.json({ approved: true, topic: null });
  } catch {
    return NextResponse.json({ approved: true, topic: null });
  }
}
