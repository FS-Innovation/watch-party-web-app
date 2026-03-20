"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";

interface ActivityData {
  pollsCompleted: number;
  totalPolls: number;
  questionSubmitted: boolean;
  questionAnswered: boolean;
  photoTaken: boolean;
  photoUrl: string | null;
  cardAnswers: { prompt: string; answer: string }[];
  pollAnswers: { question: string; answer: string }[];
  momentCapture: string | null;
  communityPollResponse: string | null;
}

export default function MeTab() {
  const { user } = useAuth();
  const { session, phase } = useSession();
  const [activity, setActivity] = useState<ActivityData>({
    pollsCompleted: 0,
    totalPolls: 4,
    questionSubmitted: false,
    questionAnswered: false,
    photoTaken: false,
    photoUrl: null,
    cardAnswers: [],
    pollAnswers: [],
    momentCapture: null,
    communityPollResponse: null,
  });

  const fetchActivity = useCallback(async () => {
    if (!user || !session) return;

    const [polls, pollResponses, questions, photos, cardResponses, cards, moments, communityPoll] =
      await Promise.all([
        supabase.from("poll_questions").select("id, question_text").eq("session_id", session.id),
        supabase.from("poll_responses").select("poll_id, answer").eq("registration_id", user.id),
        supabase.from("live_questions").select("id, answered_at").eq("registration_id", user.id).eq("session_id", session.id),
        supabase.from("photobooth_entries").select("image_url").eq("registration_id", user.id).eq("session_id", session.id).limit(1),
        supabase.from("conversation_card_responses").select("card_id, answer_text").eq("registration_id", user.id),
        supabase.from("conversation_cards").select("id, prompt_text").eq("session_id", session.id),
        supabase.from("moment_captures").select("response").eq("registration_id", user.id).eq("session_id", session.id).limit(1),
        supabase.from("community_poll_responses").select("response").eq("registration_id", user.id).eq("session_id", session.id).limit(1),
      ]);

    const pollQuestions = (polls.data || []) as { id: string; question_text: string }[];
    const myPollResponses = (pollResponses.data || []) as { poll_id: string; answer: string }[];
    const myQuestions = (questions.data || []) as { id: string; answered_at: string | null }[];
    const cardList = (cards.data || []) as { id: string; prompt_text: string }[];
    const myCardResponses = (cardResponses.data || []) as { card_id: string; answer_text: string }[];

    const pollAnswerMap = new Map(myPollResponses.map((r) => [r.poll_id, r.answer]));
    const cardMap = new Map(cardList.map((c) => [c.id, c.prompt_text]));

    setActivity({
      pollsCompleted: myPollResponses.length,
      totalPolls: pollQuestions.length || 4,
      questionSubmitted: myQuestions.length > 0,
      questionAnswered: myQuestions.some((q) => q.answered_at != null),
      photoTaken: (photos.data || []).length > 0,
      photoUrl: (photos.data as { image_url: string }[] | null)?.[0]?.image_url || null,
      cardAnswers: myCardResponses.map((r) => ({
        prompt: cardMap.get(r.card_id) || "Conversation Card",
        answer: r.answer_text,
      })),
      pollAnswers: pollQuestions
        .filter((p) => pollAnswerMap.has(p.id))
        .map((p) => ({
          question: p.question_text,
          answer: pollAnswerMap.get(p.id)!,
        })),
      momentCapture: (moments.data as { response: string }[] | null)?.[0]?.response || null,
      communityPollResponse: (communityPoll.data as { response: string }[] | null)?.[0]?.response || null,
    });
  }, [user, session]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const isPostScreening = phase === "post-screening";

  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
      {isPostScreening && (
        <div className="text-center mb-6 pb-4 border-b border-border">
          <p className="text-pink text-xs uppercase tracking-widest mb-1">
            Screening Receipt
          </p>
          <h2 className="font-serif text-xl text-foreground">
            BTD Private Screening
          </h2>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-card rounded-2xl p-5 border border-border mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink to-purple-500 flex items-center justify-center text-white font-serif text-xl">
            {user?.first_name?.[0]}
          </div>
          <div>
            <h3 className="text-foreground font-semibold text-lg">
              {user?.first_name} {user?.last_name}
            </h3>
            <p className="text-gray-500 text-sm">{user?.location || "Location not set"}</p>
            <p className="text-gray-600 text-xs">
              Ticket #{String(user?.ticket_number || 0).padStart(4, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Photo */}
      {activity.photoUrl && (
        <div className="mb-4">
          <img
            src={activity.photoUrl}
            alt="Your photobooth pic"
            className="w-full rounded-2xl border border-border"
          />
        </div>
      )}

      {/* Activity tracker */}
      <div className="bg-card rounded-2xl p-5 border border-border mb-4">
        <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
          Your Activity
        </h4>
        <div className="space-y-3">
          <ActivityRow
            label="Polls completed"
            value={`${activity.pollsCompleted}/${activity.totalPolls}`}
            done={activity.pollsCompleted === activity.totalPolls && activity.totalPolls > 0}
          />
          <ActivityRow
            label="Question submitted"
            value={activity.questionSubmitted ? "Yes" : "Not yet"}
            done={activity.questionSubmitted}
          />
          {activity.questionAnswered && (
            <ActivityRow label="Question answered by Steven" value="Yes!" done />
          )}
          <ActivityRow
            label="Photobooth"
            value={activity.photoTaken ? "Done" : "Not yet"}
            done={activity.photoTaken}
          />
        </div>
      </div>

      {/* Conversation Card answers */}
      {activity.cardAnswers.length > 0 && (
        <div className="bg-card rounded-2xl p-5 border border-border mb-4">
          <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
            Conversation Cards
          </h4>
          {activity.cardAnswers.map((ca, i) => (
            <div key={i} className={i > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
              <p className="text-gray-500 text-xs mb-1">{ca.prompt}</p>
              <p className="text-foreground text-sm">{ca.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Poll answers (post-screening) */}
      {isPostScreening && activity.pollAnswers.length > 0 && (
        <div className="bg-card rounded-2xl p-5 border border-border mb-4">
          <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
            Your Poll Answers
          </h4>
          {activity.pollAnswers.map((pa, i) => (
            <div key={i} className={i > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
              <p className="text-gray-500 text-xs mb-1">{pa.question}</p>
              <p className="text-pink text-sm">{pa.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Moment capture (post-screening) */}
      {isPostScreening && activity.momentCapture && (
        <div className="bg-card rounded-2xl p-5 border border-border mb-4">
          <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-1">
            Your Takeaway
          </h4>
          <p className="text-foreground text-sm">{activity.momentCapture}</p>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${done ? "text-pink" : "text-gray-500"}`}>
        {value}
      </span>
    </div>
  );
}
