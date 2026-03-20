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

export default function PollsTab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [polls, setPolls] = useState<PollQuestion[]>([]);
  const [results, setResults] = useState<PollResults>({});
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [completionCount, setCompletionCount] = useState(0);
  const [totalTarget, setTotalTarget] = useState(3500);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("poll_questions")
      .select("*")
      .eq("session_id", session.id)
      .not("triggered_at", "is", null)
      .order("display_order");

    if (data) setPolls(data as PollQuestion[]);
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

    // Fetch user's own answers
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

    // Calculate completion count (people who answered all polls)
    if (data) {
      const userPollCounts: { [userId: string]: Set<string> } = {};
      // We need a different query for this
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

  if (!polls.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
          </svg>
        </div>
        <h3 className="font-serif text-xl text-gray-400 mb-2">Polls coming soon</h3>
        <p className="text-gray-600 text-sm">Polls will open during half-time.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 space-y-6">
      {/* Completion counter */}
      <div className="bg-card rounded-2xl p-4 text-center border border-border">
        <p className="text-gray-400 text-sm mb-1">Collective Challenge</p>
        <p className="font-serif text-3xl text-foreground">
          <span className="text-pink">{completionCount.toLocaleString()}</span>
          <span className="text-gray-500 text-xl"> / {totalTarget.toLocaleString()}</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">completed all polls</p>
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink to-pink-light rounded-full transition-all duration-500"
            style={{ width: `${Math.min((completionCount / totalTarget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Poll questions */}
      {polls.map((poll, idx) => {
        const pollResults = results[poll.id] || {};
        const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0);
        const hasAnswered = !!userAnswers[poll.id];
        const options = Array.isArray(poll.options) ? poll.options : [];

        return (
          <div key={poll.id} className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
              Poll {idx + 1} of {polls.length}
            </p>
            <h3 className="font-serif text-lg text-foreground mb-4">
              {poll.question_text}
            </h3>

            <div className="space-y-2">
              {options.map((option: string) => {
                const count = pollResults[option] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isSelected = userAnswers[poll.id] === option;

                return (
                  <button
                    key={option}
                    onClick={() => !hasAnswered && submitAnswer(poll.id, option)}
                    disabled={hasAnswered || submitting === poll.id}
                    className={`w-full text-left relative rounded-xl p-4 transition-all ${
                      isSelected
                        ? "border-2 border-pink bg-pink/10"
                        : hasAnswered
                        ? "border border-border bg-card-hover"
                        : "border border-border hover:border-gray-500 active:scale-[0.98]"
                    }`}
                  >
                    {hasAnswered && (
                      <div
                        className="absolute inset-0 bg-pink/5 rounded-xl transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex justify-between items-center">
                      <span className="text-sm text-foreground">{option}</span>
                      {hasAnswered && (
                        <span className="text-sm text-gray-400 ml-2">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <p className="text-gray-600 text-xs mt-3 text-center">
                {totalVotes.toLocaleString()} votes · Results update in real-time
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
