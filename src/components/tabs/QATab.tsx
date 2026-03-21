"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import type { LiveQuestion } from "@/types/database";

// Demo questions for preview — community-aligned
const DEMO_QUESTIONS: LiveQuestion[] = [
  {
    id: "demo-q1",
    session_id: "demo",
    registration_id: "demo-user-1",
    question: "What made you decide to film this episode differently from the rest?",
    upvote_count: 247,
    ai_approved: true,
    moderator_status: "starred",
    ai_topic: null,
    ai_duplicate_of: null,
    submitted_at: new Date(Date.now() - 600000).toISOString(),
    answered_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "demo-q2",
    session_id: "demo",
    registration_id: "demo-user-2",
    question: "How do you envision the DOAC community evolving beyond just watching content together?",
    upvote_count: 189,
    ai_approved: true,
    moderator_status: "approved",
    ai_topic: null,
    ai_duplicate_of: null,
    submitted_at: new Date(Date.now() - 500000).toISOString(),
    answered_at: null,
  },
  {
    id: "demo-q3",
    session_id: "demo",
    registration_id: "demo-user-3",
    question: "What was the hardest conversation you've had on the show that changed your perspective the most?",
    upvote_count: 156,
    ai_approved: true,
    moderator_status: "approved",
    ai_topic: null,
    ai_duplicate_of: null,
    submitted_at: new Date(Date.now() - 400000).toISOString(),
    answered_at: null,
  },
  {
    id: "demo-q4",
    session_id: "demo",
    registration_id: "demo-user-4",
    question: "If you could go back and give your 21-year-old self one piece of advice, what would it be?",
    upvote_count: 134,
    ai_approved: true,
    moderator_status: "approved",
    ai_topic: null,
    ai_duplicate_of: null,
    submitted_at: new Date(Date.now() - 350000).toISOString(),
    answered_at: null,
  },
  {
    id: "demo-q5",
    session_id: "demo",
    registration_id: "demo-user-5",
    question: "Will there be more community events like this? This is the most connected I've felt to the DOAC world.",
    upvote_count: 112,
    ai_approved: true,
    moderator_status: "approved",
    ai_topic: null,
    ai_duplicate_of: null,
    submitted_at: new Date(Date.now() - 200000).toISOString(),
    answered_at: null,
  },
];

export default function QATab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!session) {
      // No session — use demo data
      setQuestions(DEMO_QUESTIONS);
      setIsDemo(true);
      return;
    }
    const { data } = await supabase
      .from("live_questions")
      .select("*")
      .eq("session_id", session.id)
      .eq("ai_approved", true)
      .in("moderator_status", ["approved", "starred"])
      .order("upvote_count", { ascending: false });

    if (data && data.length > 0) {
      setQuestions(data as LiveQuestion[]);
    } else {
      setQuestions(DEMO_QUESTIONS);
      setIsDemo(true);
    }

    if (user && session) {
      const { data: myQ } = await supabase
        .from("live_questions")
        .select("id")
        .eq("session_id", session.id)
        .eq("registration_id", user.id)
        .limit(1);

      if (myQ && myQ.length > 0) setHasSubmitted(true);

      const { data: upvotes } = await supabase
        .from("question_upvotes")
        .select("question_id")
        .eq("registration_id", user.id);

      if (upvotes) {
        setMyUpvotes(new Set(upvotes.map((u: { question_id: string }) => u.question_id)));
      }
    }
  }, [session, user]);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 5000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  const submitQuestion = async () => {
    if (!user || !question.trim() || submitting || hasSubmitted) return;
    setSubmitting(true);

    if (isDemo) {
      // Demo mode — add locally
      const newQ: LiveQuestion = {
        id: `demo-user-${Date.now()}`,
        session_id: "demo",
        registration_id: user.id,
        question: question.trim(),
        upvote_count: 1,
        ai_approved: true,
        moderator_status: "approved",
        ai_topic: null,
        ai_duplicate_of: null,
        submitted_at: new Date().toISOString(),
        answered_at: null,
      };
      setQuestions((prev) => [newQ, ...prev]);
      setQuestion("");
      setHasSubmitted(true);
      setSubmitMessage("Your question has been submitted for review.");
      setTimeout(() => setSubmitMessage(""), 5000);
      setSubmitting(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("magic_token");
      const res = await fetch("/api/qa/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token, question: question.trim() }),
      });

      if (res.ok) {
        setQuestion("");
        setHasSubmitted(true);
        setSubmitMessage("Your question has been submitted for review.");
        setTimeout(() => setSubmitMessage(""), 5000);
        fetchQuestions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    if (!user || myUpvotes.has(questionId)) return;

    if (isDemo) {
      setMyUpvotes((prev) => new Set([...prev, questionId]));
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, upvote_count: q.upvote_count + 1 } : q
        )
      );
      return;
    }

    const token = sessionStorage.getItem("magic_token");
    const res = await fetch("/api/qa/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magic_token: token, question_id: questionId }),
    });

    if (res.ok) {
      setMyUpvotes((prev) => new Set([...prev, questionId]));
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, upvote_count: q.upvote_count + 1 } : q
        )
      );
    }
  };

  return (
    <div className="pt-12 pb-28 px-6 max-w-2xl mx-auto">
      {/* Header */}
      <section className="mb-8">
        <h2 className="font-headline font-bold uppercase tracking-tighter text-4xl leading-none mb-2">
          ASK STEVEN
        </h2>
        <p className="font-body text-sm font-light text-on-surface-variant/70 tracking-wide">
          5 will be answered live
        </p>
      </section>

      {/* Submit area */}
      {!hasSubmitted ? (
        <section className="bg-[#111] rounded-xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-outline-variant/10 mb-8">
          <div className="space-y-6">
            <div className="relative">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
                placeholder="What would you ask Steven?"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-6 font-body text-on-surface-variant placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/50 focus:border-primary-container/50 transition-all resize-none"
                rows={4}
                maxLength={300}
              />
              <div className="absolute bottom-4 right-4 font-label text-[10px] tracking-widest text-on-surface-variant/40">
                {question.length}/300
              </div>
            </div>

            <button
              onClick={submitQuestion}
              disabled={!question.trim() || submitting}
              className="w-full bg-surface-container-highest/50 border border-primary-container/30 text-primary-fixed-dim font-headline font-bold py-5 rounded-md hover:bg-primary-container hover:text-on-primary-container transition-all duration-300 uppercase tracking-widest text-sm flex items-center justify-center gap-3 group active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? "SUBMITTING..." : "BROADCAST"}
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </section>
      ) : (
        <div className="mb-8 bg-surface-container-low p-6 border-l-2 border-primary-container">
          <p className="font-label text-sm text-primary">
            {submitMessage || "Your question has been submitted for review."}
          </p>
        </div>
      )}

      {/* Live Queue */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse shadow-[0_0_8px_#b43041]" />
          <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Live Queue ({questions.length})
          </h3>
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`bg-surface-container-lowest border p-6 transition-all ${
                q.answered_at
                  ? "border-secondary/30"
                  : "border-outline-variant/15"
              }`}
            >
              <div className="flex gap-4">
                <button
                  onClick={() => upvoteQuestion(q.id)}
                  disabled={myUpvotes.has(q.id)}
                  className={`flex flex-col items-center min-w-[40px] pt-1 transition-all ${
                    myUpvotes.has(q.id) ? "text-primary" : "text-on-surface-variant/40 hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">arrow_upward</span>
                  <span className="font-label text-sm font-medium">{q.upvote_count}</span>
                </button>
                <div className="flex-1">
                  <p className="font-body text-sm text-on-surface leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-label text-[10px] text-on-surface-variant/40 tracking-widest">
                      {new Date(q.submitted_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {q.answered_at && (
                      <span className="font-label text-[10px] text-secondary flex items-center gap-1 tracking-widest">
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        ANSWERED BY STEVEN
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <p className="font-body text-sm text-on-surface-variant/40 text-center py-12">
              No questions yet. Be the first to ask.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
