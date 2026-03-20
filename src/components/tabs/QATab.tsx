"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import type { LiveQuestion } from "@/types/database";

export default function QATab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const fetchQuestions = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("live_questions")
      .select("*")
      .eq("session_id", session.id)
      .eq("ai_approved", true)
      .in("moderator_status", ["approved", "starred"])
      .order("upvote_count", { ascending: false });

    if (data) setQuestions(data as LiveQuestion[]);

    // Check if user already submitted
    if (user) {
      const { data: myQ } = await supabase
        .from("live_questions")
        .select("id")
        .eq("session_id", session.id)
        .eq("registration_id", user.id)
        .limit(1);

      if (myQ && myQ.length > 0) setHasSubmitted(true);

      // Fetch user's upvotes
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
        setSubmitMessage("Your question has been submitted! We'll review it shortly.");
        setTimeout(() => setSubmitMessage(""), 5000);
        fetchQuestions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    if (!user || myUpvotes.has(questionId)) return;

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
    <div className="px-4 py-6 pb-24">
      <h2 className="font-serif text-2xl text-foreground mb-1">Ask Steven</h2>
      <p className="text-gray-500 text-sm mb-6">
        Submit your question and upvote others
      </p>

      {/* Submit area */}
      {!hasSubmitted ? (
        <div className="mb-6 space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder="Ask Steven anything..."
            className="w-full bg-card border border-border rounded-xl p-4 text-foreground placeholder-gray-600 resize-none h-24 focus:outline-none focus:border-pink"
            maxLength={300}
          />
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-xs">{question.length}/300</span>
            <button
              onClick={submitQuestion}
              disabled={!question.trim() || submitting}
              className="bg-pink hover:bg-pink-dark disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all active:scale-[0.98]"
            >
              {submitting ? "Sending..." : "Broadcast"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-card rounded-xl p-4 border border-pink/20">
          <p className="text-pink text-sm">
            {submitMessage || "Your question has been submitted."}
          </p>
        </div>
      )}

      {/* Live queue */}
      <div className="space-y-3">
        <h3 className="text-gray-400 text-sm font-medium">
          Live Questions ({questions.length})
        </h3>

        {questions.map((q) => (
          <div
            key={q.id}
            className={`bg-card rounded-xl p-4 border ${
              q.answered_at ? "border-green-500/30" : "border-border"
            }`}
          >
            <div className="flex gap-3">
              <button
                onClick={() => upvoteQuestion(q.id)}
                disabled={myUpvotes.has(q.id)}
                className={`flex flex-col items-center min-w-[40px] pt-1 ${
                  myUpvotes.has(q.id) ? "text-pink" : "text-gray-500"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{q.upvote_count}</span>
              </button>
              <div className="flex-1">
                <p className="text-foreground text-sm">{q.question}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-600 text-xs">
                    {new Date(q.submitted_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {q.answered_at && (
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      Answered
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">
            No questions yet. Be the first to ask!
          </p>
        )}
      </div>
    </div>
  );
}
