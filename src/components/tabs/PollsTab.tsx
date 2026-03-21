"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import type { PollQuestion } from "@/types/database";

interface PollResults {
  [pollId: string]: { [answer: string]: number };
}

interface UserAnswers {
  [pollId: string]: string;
}

// Demo polls for preview — aligned with BTD screening brief
const DEMO_POLLS: PollQuestion[] = [
  {
    id: "demo-1",
    session_id: "demo",
    question_text: "What was your favourite part of tonight?",
    options: ["The episode itself", "The intermission & community vibes", "The live Q&A with Steven", "All of it — the full experience"],
    poll_type: "single",
    display_order: 1,
    triggered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    session_id: "demo",
    question_text: "Would you attend another virtual screening?",
    options: ["Absolutely — sign me up", "Maybe, depends on timing", "I'd prefer in-person", "Not for me"],
    poll_type: "single",
    display_order: 2,
    triggered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    session_id: "demo",
    question_text: "Would you want a community space to connect with other members?",
    options: ["Yes — Discord or similar", "Yes — WhatsApp or Telegram", "I'd lurk but probably not post", "No, I'm here for the content"],
    poll_type: "single",
    display_order: 3,
    triggered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const DEMO_RESULTS: PollResults = {
  "demo-1": { "The episode itself": 412, "The intermission & community vibes": 689, "The live Q&A with Steven": 534, "All of it — the full experience": 847 },
  "demo-2": { "Absolutely — sign me up": 1423, "Maybe, depends on timing": 387, "I'd prefer in-person": 201, "Not for me": 48 },
  "demo-3": { "Yes — Discord or similar": 756, "Yes — WhatsApp or Telegram": 523, "I'd lurk but probably not post": 412, "No, I'm here for the content": 198 },
};

export default function PollsTab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [polls, setPolls] = useState<PollQuestion[]>([]);
  const [results, setResults] = useState<PollResults>({});
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [completionCount, setCompletionCount] = useState(0);
  const [totalTarget] = useState(2500);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchPolls = useCallback(async () => {
    if (!session) {
      // No session — use demo data for preview
      setPolls(DEMO_POLLS);
      setResults(DEMO_RESULTS);
      setCompletionCount(1847);
      setIsDemo(true);
      return;
    }
    const { data } = await supabase
      .from("poll_questions")
      .select("*")
      .eq("session_id", session.id)
      .not("triggered_at", "is", null)
      .order("display_order");

    if (data && data.length > 0) {
      setPolls(data as PollQuestion[]);
    } else {
      // No live polls — fall back to demo
      setPolls(DEMO_POLLS);
      setResults(DEMO_RESULTS);
      setCompletionCount(1847);
      setIsDemo(true);
    }
  }, [session]);

  const fetchResults = useCallback(async () => {
    if (!polls.length) return;
    const pollIds = polls.map((p) => p.id);

    const { data } = await supabase
      .from("poll_responses")
      .select("poll_id, answer")
      .in("poll_id", pollIds);

    if (data) {
      const grouped: PollResults = {};
      data.forEach((r: { poll_id: string; answer: string }) => {
        if (!grouped[r.poll_id]) grouped[r.poll_id] = {};
        grouped[r.poll_id][r.answer] = (grouped[r.poll_id][r.answer] || 0) + 1;
      });
      setResults(grouped);
    }

    if (user) {
      const { data: myAnswers } = await supabase
        .from("poll_responses")
        .select("poll_id, answer")
        .eq("registration_id", user.id)
        .in("poll_id", pollIds);

      if (myAnswers) {
        const answers: UserAnswers = {};
        myAnswers.forEach((a: { poll_id: string; answer: string }) => {
          answers[a.poll_id] = a.answer;
        });
        setUserAnswers(answers);
      }
    }

    if (data) {
      const userPollCounts: { [userId: string]: Set<string> } = {};
      const { data: allResponses } = await supabase
        .from("poll_responses")
        .select("registration_id, poll_id")
        .in("poll_id", pollIds);

      if (allResponses) {
        allResponses.forEach((r: { registration_id: string; poll_id: string }) => {
          if (!userPollCounts[r.registration_id]) {
            userPollCounts[r.registration_id] = new Set();
          }
          userPollCounts[r.registration_id].add(r.poll_id);
        });

        const completed = Object.values(userPollCounts).filter(
          (s) => s.size >= polls.length
        ).length;
        setCompletionCount(completed);
      }
    }
  }, [polls, user]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const submitAnswer = async (pollId: string, answer: string) => {
    if (!user || submitting) return;
    setSubmitting(pollId);

    if (isDemo) {
      // Demo mode — handle locally
      setUserAnswers((prev) => ({ ...prev, [pollId]: answer }));
      setResults((prev) => ({
        ...prev,
        [pollId]: {
          ...prev[pollId],
          [answer]: (prev[pollId]?.[answer] || 0) + 1,
        },
      }));
      setSubmitting(null);
      return;
    }

    try {
      const token = sessionStorage.getItem("magic_token");
      const res = await fetch("/api/polls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token, poll_id: pollId, answer }),
      });

      if (res.ok) {
        setUserAnswers((prev) => ({ ...prev, [pollId]: answer }));
        fetchResults();
      }
    } finally {
      setSubmitting(null);
    }
  };

  const pct = totalTarget > 0 ? Math.round((completionCount / totalTarget) * 100) : 0;

  if (!polls.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">poll</span>
        <h3 className="font-headline font-bold text-xl text-on-surface-variant mb-2">Polls coming soon</h3>
        <p className="font-body text-sm text-on-surface-variant/60">Polls will open during intermission.</p>
      </div>
    );
  }

  return (
    <div className="pt-12 pb-28 px-6 max-w-2xl mx-auto">
      {/* Header */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse shadow-[0_0_12px_#b43041]" />
          <h2 className="font-headline font-bold uppercase tracking-tighter text-4xl text-on-surface">LIVE POLLS</h2>
        </div>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60">Real-time audience sentiment</p>
      </section>

      {/* Poll Cards */}
      {polls.map((poll) => {
        const pollResults = results[poll.id] || {};
        const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0);
        const hasAnswered = !!userAnswers[poll.id];
        const options = Array.isArray(poll.options) ? poll.options : [];

        return (
          <div key={poll.id} className="bg-surface-container-lowest border border-outline-variant/15 p-8 mb-8 relative overflow-hidden">
            {hasAnswered && (
              <div className="absolute top-0 right-0 p-4">
                <span className="font-label text-[10px] text-primary tracking-widest">VOTED</span>
              </div>
            )}
            {!hasAnswered && (
              <div className="absolute top-0 right-0 p-4">
                <span className="font-label text-[10px] text-secondary tracking-widest">ACTIVE</span>
              </div>
            )}

            <h3 className="font-headline text-2xl mb-8 leading-tight tracking-tight max-w-xs">
              {poll.question_text}
            </h3>

            <div className="space-y-4">
              {options.map((option: string) => {
                const count = pollResults[option] || 0;
                const optPct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isSelected = userAnswers[poll.id] === option;

                return (
                  <button
                    key={option}
                    onClick={() => !hasAnswered && submitAnswer(poll.id, option)}
                    disabled={hasAnswered || submitting === poll.id}
                    className={`w-full py-4 px-6 border text-left font-label text-sm tracking-wide transition-all active:scale-[0.98] relative overflow-hidden ${
                      isSelected
                        ? "border-primary text-primary shadow-[0_0_20px_rgba(26,107,122,0.2)] bg-primary/5"
                        : hasAnswered
                        ? "border-outline-variant/15 text-on-surface-variant"
                        : "border-outline-variant/15 text-on-surface-variant hover:border-primary/40"
                    }`}
                  >
                    {hasAnswered && (
                      <div
                        className="absolute inset-0 bg-primary/5 transition-all duration-500"
                        style={{ width: `${optPct}%` }}
                      />
                    )}
                    <div className="relative flex justify-between items-center">
                      <span className="uppercase">{option}</span>
                      {hasAnswered && (
                        <span className="text-on-surface-variant/60">{optPct}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <p className="font-label text-[10px] text-on-surface-variant/40 mt-4 tracking-widest text-center">
                {totalVotes.toLocaleString()} VOTES · LIVE
              </p>
            )}
          </div>
        );
      })}

      {/* Collective Challenge */}
      <section className="mb-12">
        <h2 className="font-headline font-bold uppercase tracking-tighter text-4xl mb-6 text-on-surface">
          COLLECTIVE CHALLENGE
        </h2>
        <div className="bg-surface-container/40 p-8 border-l-2 border-primary-container">
          <div className="flex justify-between items-end mb-4">
            <span className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface">
              {completionCount.toLocaleString()}
            </span>
            <span className="font-label text-sm tracking-widest text-on-surface-variant/40">
              / {totalTarget.toLocaleString()} RESPONSES
            </span>
          </div>
          <div className="w-full h-px bg-outline-variant/20 mb-1">
            <div
              className="h-full bg-primary-container shadow-[0_0_15px_#1a6b7a]"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <p className="font-label text-[10px] tracking-[0.15em] text-on-surface-variant/60">
              GOAL: UNLOCK BONUS CONTENT
            </p>
            <p className="font-label text-[10px] tracking-[0.15em] text-primary">
              {pct}% COMPLETE
            </p>
          </div>
        </div>
      </section>

      {/* Mystery Note */}
      <div className="mt-16 space-y-12">
        <div className="relative py-4 pl-12">
          <span className="material-symbols-outlined absolute left-0 top-6 text-secondary/40 text-3xl">
            edit_note
          </span>
          <p className="font-cursive text-3xl text-secondary-fixed-dim leading-snug">
            &ldquo;when we get there, Steven has something to say&rdquo;
          </p>
        </div>
        <div className="text-center pt-8 border-t border-outline-variant/10">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant/50 leading-relaxed">
            Complete all polls to be considered for the meet &amp; greet
          </p>
        </div>
      </div>
    </div>
  );
}
