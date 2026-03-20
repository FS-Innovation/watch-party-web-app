"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import type { ConversationCard, ConversationCardResponse, Visibility } from "@/types/database";

export default function CardsTab() {
  const { user } = useAuth();
  const { session } = useSession();
  const [cards, setCards] = useState<ConversationCard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("anonymous");
  const [myResponses, setMyResponses] = useState<{ [cardId: string]: ConversationCardResponse }>({});
  const [otherResponses, setOtherResponses] = useState<ConversationCardResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("conversation_cards")
      .select("*")
      .eq("session_id", session.id)
      .order("display_order");

    if (data) setCards(data as ConversationCard[]);
  }, [session]);

  const fetchMyResponses = useCallback(async () => {
    if (!user || !cards.length) return;
    const cardIds = cards.map((c) => c.id);
    const { data } = await supabase
      .from("conversation_card_responses")
      .select("*")
      .eq("registration_id", user.id)
      .in("card_id", cardIds);

    if (data) {
      const mapped: { [id: string]: ConversationCardResponse } = {};
      data.forEach((r) => (mapped[(r as ConversationCardResponse).card_id] = r as ConversationCardResponse));
      setMyResponses(mapped);
    }
  }, [user, cards]);

  const fetchOtherResponses = useCallback(async () => {
    const card = cards[currentCardIdx];
    if (!card) return;
    const { data } = await supabase
      .from("conversation_card_responses")
      .select("*")
      .eq("card_id", card.id)
      .neq("visibility", "optout")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setOtherResponses(data as ConversationCardResponse[]);
  }, [cards, currentCardIdx]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    fetchMyResponses();
  }, [fetchMyResponses]);

  useEffect(() => {
    if (showOthers) fetchOtherResponses();
  }, [showOthers, fetchOtherResponses]);

  const submitAnswer = async () => {
    const card = cards[currentCardIdx];
    if (!user || !card || !answer.trim() || submitting) return;
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
        fetchMyResponses();
        setShowOthers(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentCard = cards[currentCardIdx];
  const hasAnswered = currentCard ? !!myResponses[currentCard.id] : false;

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <h3 className="font-serif text-xl text-gray-400 mb-2">Conversation Cards</h3>
        <p className="text-gray-600 text-sm">Cards will appear here soon.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      {/* Card navigation */}
      <div className="flex gap-2 mb-4 justify-center">
        {cards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => { setCurrentCardIdx(idx); setShowOthers(false); }}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
              idx === currentCardIdx
                ? "bg-pink text-white"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {currentCard && (
        <div className="space-y-4">
          {/* Card image */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border">
            {currentCard.card_image_url ? (
              <img
                src={currentCard.card_image_url}
                alt={currentCard.prompt_text}
                className="w-full h-auto"
              />
            ) : (
              <div className="p-8 text-center">
                <p className="font-serif text-xl text-foreground">
                  {currentCard.prompt_text}
                </p>
              </div>
            )}
          </div>

          {/* Answer input */}
          {!hasAnswered ? (
            <div className="space-y-3">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, 300))}
                placeholder="Your answer..."
                className="w-full bg-card border border-border rounded-xl p-4 text-foreground placeholder-gray-600 resize-none h-24 focus:outline-none focus:border-pink"
                maxLength={300}
              />
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-xs">{answer.length}/300</span>
              </div>

              {/* Visibility toggle */}
              <div className="flex gap-2">
                {(["name", "anonymous", "optout"] as Visibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      visibility === v
                        ? "bg-pink text-white"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {v === "name" ? "Show my name" : v === "anonymous" ? "Anonymous" : "Private"}
                  </button>
                ))}
              </div>

              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                className="w-full bg-pink hover:bg-pink-dark disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                {submitting ? "Submitting..." : "Submit Answer"}
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-4 border border-pink/20">
              <p className="text-gray-400 text-xs mb-1">Your answer</p>
              <p className="text-foreground">{myResponses[currentCard.id]?.answer_text}</p>
            </div>
          )}

          {/* Other responses */}
          {hasAnswered && (
            <div>
              <button
                onClick={() => setShowOthers(!showOthers)}
                className="text-pink text-sm mb-3"
              >
                {showOthers ? "Hide others' answers" : "See others' answers"}
              </button>

              {showOthers && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {otherResponses
                    .filter((r) => r.registration_id !== user?.id)
                    .map((r) => (
                      <div key={r.id} className="bg-card-hover rounded-xl p-3 border border-border">
                        <p className="text-foreground text-sm">{r.answer_text}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {r.visibility === "anonymous" ? "Anonymous" : "Community member"}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Product link */}
          <p className="text-center text-gray-600 text-xs">
            Steven&apos;s Conversation Cards
          </p>
        </div>
      )}
    </div>
  );
}
