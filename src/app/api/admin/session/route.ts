import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_POLLS = [
  {
    question_text: "How are you watching tonight?",
    options: [
      "On my couch with snacks",
      "In bed",
      "At my desk pretending to work",
      "With friends or family",
    ],
    poll_type: "experience",
    display_order: 1,
  },
  {
    question_text: "Would you come to another screening?",
    options: [
      "Already clearing my calendar",
      "If the episode is right",
      "Maybe",
      "This was a one-time thing",
    ],
    poll_type: "experience",
    display_order: 2,
  },
  {
    question_text: "That moment just now — did it land?",
    options: [
      "Hit me right in the chest",
      "Made me think",
      "Didn't really connect",
      "I need to rewatch that",
    ],
    poll_type: "btd_episode",
    display_order: 3,
  },
  {
    question_text: "What will you remember most?",
    options: [
      "A specific story Steven told",
      "Something that challenged how I think",
      "A moment that felt really honest",
      "The energy of watching with everyone",
    ],
    poll_type: "btd_episode",
    display_order: 4,
  },
];

export async function POST() {
  try {
    const supabase = createAdminClient();

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("watch_party_sessions")
      .insert({
        event_id: `btd-screening-${Date.now()}`,
        current_phase: "pre-screening",
        started_at: null,
        ended_at: null,
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message || "Failed to create session" }, { status: 400 });
    }

    // Create default polls
    const pollInserts = DEFAULT_POLLS.map((poll) => ({
      ...poll,
      session_id: session.id,
      options: JSON.stringify(poll.options),
      triggered_at: null,
    }));

    await supabase.from("poll_questions").insert(pollInserts);

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
