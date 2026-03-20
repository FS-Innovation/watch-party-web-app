"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Step = "moment" | "community" | "done";

interface PostScreeningTakeoverProps {
  onComplete: () => void;
}

export default function PostScreeningTakeover({ onComplete }: PostScreeningTakeoverProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("moment");
  const [momentText, setMomentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitMoment = async () => {
    if (!momentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("magic_token");
      await fetch("/api/moments/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token, response: momentText.trim() }),
      });
      setStep("community");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCommunityPoll = async (response: string) => {
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("magic_token");
      await fetch("/api/community-poll/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token, response }),
      });
      setStep("done");
      setTimeout(onComplete, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-pink">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">Thank you, {user?.first_name}</h2>
          <p className="text-gray-400">Check your ME tab for your screening receipt.</p>
        </div>
      </div>
    );
  }

  if (step === "community") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 px-6">
        <div className="w-full max-w-md">
          <h2 className="font-serif text-2xl text-foreground text-center mb-2">
            One more thing
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Would you want to connect with like-minded people in a virtual space like Telegram, Discord, or WhatsApp?
          </p>
          <div className="space-y-3">
            {[
              "Yes, I'd love that",
              "Maybe later",
              "Not for me",
            ].map((option) => (
              <button
                key={option}
                onClick={() => submitCommunityPoll(option)}
                disabled={submitting}
                className="w-full p-4 rounded-xl border border-border text-foreground text-left hover:border-pink transition-colors active:scale-[0.98]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50 px-6">
      <div className="w-full max-w-md">
        <p className="text-pink text-xs uppercase tracking-widest text-center mb-2">
          Moment Capture
        </p>
        <h2 className="font-serif text-2xl text-foreground text-center mb-8">
          Your one takeaway from tonight?
        </h2>
        <textarea
          value={momentText}
          onChange={(e) => setMomentText(e.target.value.slice(0, 500))}
          placeholder="What will you remember..."
          className="w-full bg-card border border-border rounded-xl p-4 text-foreground placeholder-gray-600 resize-none h-32 focus:outline-none focus:border-pink mb-2"
          maxLength={500}
          autoFocus
        />
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 text-xs">{momentText.length}/500</span>
        </div>
        <button
          onClick={submitMoment}
          disabled={!momentText.trim() || submitting}
          className="w-full bg-pink hover:bg-pink-dark disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-all active:scale-[0.98]"
        >
          {submitting ? "Submitting..." : "Share Your Takeaway"}
        </button>
      </div>
    </div>
  );
}
