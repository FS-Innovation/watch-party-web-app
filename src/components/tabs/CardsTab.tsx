"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import type { ConversationCard, Visibility } from "@/types/database";

export default function CardsTab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [cards, setCards] = useState<ConversationCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("name");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [answeredCount, setAnsweredCount] = useState(0);

  const fetchCards = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("conversation_cards")
      .select("*")
      .eq("session_id", session.id)
      .order("display_order");

    if (data) setCards(data as ConversationCard[]);
  }, [session]);

  const fetchAnswers = useCallback(async () => {
    if (!cards.length || !user) return;
    const card = cards[currentIdx];

    const { count } = await supabase
      .from("conversation_card_responses")
      .select("*", { count: "exact", head: true })
      .eq("card_id", card.id);

    setAnsweredCount(count || 0);

    const { data: myResponses } = await supabase
      .from("conversation_card_responses")
      .select("card_id")
      .eq("registration_id", user.id);

    if (myResponses) {
      setSubmitted(new Set(myResponses.map((r: { card_id: string }) => r.card_id)));
    }
  }, [cards, currentIdx, user]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  const submitAnswer = async () => {
    if (!user || !answer.trim() || submitting) return;
    const card = cards[currentIdx];
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("magic_token");
      const res = await fetch("/api/cards/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magic_token: token,
          card_id: card.id,
          answer_text: answer.trim(),
          visibility,
        }),
      });

      if (res.ok) {
        setAnswer("");
        setSubmitted((prev) => new Set([...prev, card.id]));
        fetchAnswers();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">layers</span>
        <h3 className="font-headline font-bold text-xl text-on-surface-variant mb-2">Cards coming soon</h3>
        <p className="font-body text-sm text-on-surface-variant/60">Conversation cards will appear here.</p>
      </div>
    );
  }

  const card = cards[currentIdx];
  const hasSubmitted = submitted.has(card.id);

  return (
    <div className="pt-24 pb-32 px-6 max-w-2xl mx-auto min-h-screen">
      {/* Breadcrumb */}
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-1">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant font-medium">
            ICEBREAKER
          </p>
          <div className="h-0.5 w-12 bg-primary-container" />
        </div>
        <p className="font-label text-xs tracking-widest text-on-surface-variant/40">
          {String(currentIdx + 1).padStart(2, "0")}/{String(cards.length).padStart(2, "0")}
        </p>
      </div>

      {/* Main Card */}
      <section className="bg-[#111] rounded-xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-outline-variant/10 mb-8">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-6 bg-surface-container-highest/20 rotate-1" />

        <div className="space-y-12">
          <div className="relative">
            <span className="material-symbols-outlined absolute -left-2 -top-2 text-primary-container/20 text-4xl">
              format_quote
            </span>
            <h2 className="font-cursive text-2xl md:text-3xl leading-relaxed text-on-surface/90 pt-4">
              {card.prompt_text}
            </h2>
          </div>

          {!hasSubmitted ? (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.slice(0, 300))}
                  placeholder="Write your note here..."
                  rows={5}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-6 font-body text-on-surface-variant placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/50 focus:border-primary-container/50 transition-all resize-none"
                  maxLength={300}
                />
                <div className="absolute bottom-4 right-4 font-label text-[10px] tracking-widest text-on-surface-variant/40">
                  {answer.length}/300
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                {(["name", "anonymous", "optout"] as Visibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className={`font-label text-[10px] uppercase tracking-[0.15em] pb-1 transition-all active:scale-95 ${
                      visibility === v
                        ? "font-semibold text-secondary border-b border-secondary"
                        : "font-medium text-on-surface-variant/60 hover:text-on-surface-variant"
                    }`}
                  >
                    {v === "name" ? "MY NAME" : v === "anonymous" ? "ANONYMOUS" : "PRIVATE"}
                  </button>
                ))}
              </div>

              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                className="w-full bg-surface-container-highest/50 border border-primary-container/30 text-primary-fixed-dim font-headline font-bold py-5 rounded-md hover:bg-primary-container hover:text-on-primary-container transition-all duration-300 uppercase tracking-widest text-sm flex items-center justify-center gap-3 group active:scale-[0.98] disabled:opacity-40"
              >
                {submitting ? "SUBMITTING..." : "SUBMIT"}
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">check_circle</span>
              <p className="font-label text-sm text-on-surface-variant">Your note has been submitted</p>
            </div>
          )}
        </div>
      </section>

      {/* Social Context */}
      <div className="flex flex-col items-center gap-4">
        {answeredCount > 0 && (
          <>
            <div className="flex -space-x-3 overflow-hidden">
              {Array.from({ length: Math.min(answeredCount, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-surface-container-highest"
                />
              ))}
              {answeredCount > 3 && (
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high ring-2 ring-background">
                  <span className="text-[10px] font-label font-bold text-primary-fixed-dim">
                    +{answeredCount - 3}
                  </span>
                </div>
              )}
            </div>
            <p className="font-body text-xs text-on-surface-variant/60">
              <span className="text-on-surface font-medium">{answeredCount} others</span> answered this prompt
            </p>
          </>
        )}
      </div>

      {/* Card Navigation */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIdx ? "bg-primary w-6" : "bg-outline-variant/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
