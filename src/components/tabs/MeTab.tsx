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
    <div className="relative px-6 pt-12 pb-28 max-w-lg mx-auto overflow-hidden min-h-screen">
      {/* Atmosphere Glow */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-48 h-48 bg-secondary-container/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Title */}
      <div className="mb-12 relative">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary mb-2">
          digital keepsake
        </p>
        <h2 className="font-headline font-bold uppercase tracking-tighter text-4xl leading-none text-on-surface">
          YOUR SCREENING RECEIPT
        </h2>
      </div>

      {/* Receipt Container */}
      <div className="relative bg-surface-container-low p-8 rounded-lg shadow-2xl border-l border-primary-container/20 overflow-hidden">
        {/* Profile */}
        <div className="flex items-start gap-6 mb-12">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-secondary p-1">
              <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="font-headline font-bold text-2xl text-on-surface">
                  {user?.first_name?.[0] || "G"}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-tertiary-container rounded-full flex items-center justify-center shadow-lg">
              <span
                className="material-symbols-outlined text-[12px] text-on-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-headline font-bold text-2xl uppercase tracking-tight text-on-surface">
              {user?.first_name} {user?.last_name}
            </h3>
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
              {user?.location || "Guest"}
            </p>
            <p className="font-mono text-[10px] text-primary/60 mt-2">
              #BTD-{String(user?.ticket_number || 0).padStart(4, "0")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6 mb-12 relative">
          <StatRow
            label="Polls completed"
            value={`${activity.pollsCompleted}/${activity.totalPolls}`}
            done={activity.pollsCompleted === activity.totalPolls && activity.totalPolls > 0}
          />
          <StatRow
            label="Question submitted"
            value={activity.questionSubmitted ? (activity.questionAnswered ? "" : "Submitted") : "Not yet"}
            done={activity.questionSubmitted}
            special={activity.questionAnswered ? "ANSWERED BY STEVEN" : undefined}
          />
          <StatRow
            label="Icebreakers"
            value={`${activity.cardAnswers.length}/${activity.cardAnswers.length || 2}`}
            done={activity.cardAnswers.length > 0}
          />
          <StatRow
            label="Photo captured"
            value=""
            done={activity.photoTaken}
          />
        </div>

        {/* Moment Capture Quote */}
        {activity.momentCapture && (
          <div className="relative py-8 border-t border-outline-variant/10">
            <div className="absolute -top-3 left-6 bg-surface-container-low px-2">
              <span
                className="material-symbols-outlined text-secondary/40 text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                format_quote
              </span>
            </div>
            <p className="font-cursive text-3xl text-on-surface leading-tight text-center">
              &ldquo;{activity.momentCapture}&rdquo;
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-dashed border-outline-variant/20 text-center">
          <p className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/50 italic">
            screenshot this — it&apos;s yours to keep.
          </p>
        </div>

        {/* Ticket Notch Cuts */}
        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-surface rounded-full -translate-y-1/2" />
        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-surface rounded-full -translate-y-1/2" />
      </div>

      {/* Card Answers (expandable section) */}
      {activity.cardAnswers.length > 0 && (
        <div className="mt-8">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant/50 mb-4">
            Your Icebreaker Answers
          </p>
          {activity.cardAnswers.map((ca, i) => (
            <div key={i} className="bg-surface-container-low p-6 border-l border-primary-container/20 mb-3">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40 mb-2">
                {ca.prompt}
              </p>
              <p className="font-body text-sm text-on-surface">{ca.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Poll Answers (post-screening) */}
      {isPostScreening && activity.pollAnswers.length > 0 && (
        <div className="mt-8">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant/50 mb-4">
            Your Poll Answers
          </p>
          {activity.pollAnswers.map((pa, i) => (
            <div key={i} className="bg-surface-container-low p-6 border-l border-primary-container/20 mb-3">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40 mb-2">
                {pa.question}
              </p>
              <p className="font-body text-sm text-primary">{pa.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Decorative */}
      <div className="mt-12 flex justify-center opacity-30">
        <div className="w-1 h-12 bg-gradient-to-b from-secondary to-transparent" />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  done,
  special,
}: {
  label: string;
  value: string;
  done: boolean;
  special?: string;
}) {
  return (
    <div className="flex items-center justify-between group">
      <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
        {label}
      </span>
      <div className="flex items-center gap-3">
        {special ? (
          <>
            <span className="font-body text-[11px] font-medium text-secondary uppercase">
              {special}
            </span>
            <span
              className="material-symbols-outlined text-secondary text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          </>
        ) : (
          <>
            {value && <span className="font-body text-sm font-light">{value}</span>}
            {done && (
              <span className="material-symbols-outlined text-primary text-sm">check</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
