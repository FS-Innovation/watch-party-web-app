"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";

interface WelcomeScreenProps {
  onEnter: () => void;
}

export default function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const { user } = useAuth();
  const { session } = useSession();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const attendeeCount = session?.attendee_count || 0;

  // Generate avatar bubbles
  const bubbles = Array.from({ length: Math.min(attendeeCount, 12) }, (_, i) => ({
    id: i,
    size: 32 + Math.random() * 16,
    x: 10 + (i % 6) * 15 + Math.random() * 5,
    delay: i * 0.1,
  }));

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-40">
      <div
        className={`text-center transition-all duration-1000 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">
          BTD Private Screening
        </p>

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Welcome back,
          <br />
          <span className="text-pink">{user?.first_name}</span>
        </h1>

        {attendeeCount > 0 && (
          <p className="text-gray-400 text-lg mb-2">
            Join{" "}
            <span className="text-foreground font-semibold">
              {attendeeCount.toLocaleString()}
            </span>{" "}
            others
          </p>
        )}

        {user?.ticket_number && (
          <p className="text-gray-500 text-sm mb-8">
            Ticket #{String(user.ticket_number).padStart(4, "0")}
          </p>
        )}

        {/* Avatar bubbles */}
        <div className="flex justify-center gap-1 mb-10 flex-wrap max-w-xs mx-auto">
          {bubbles.map((b) => (
            <div
              key={b.id}
              className="rounded-full bg-gradient-to-br from-pink/30 to-purple-500/30 border border-pink/20"
              style={{
                width: b.size,
                height: b.size,
                animationDelay: `${b.delay}s`,
              }}
            />
          ))}
        </div>

        <button
          onClick={onEnter}
          className="bg-pink hover:bg-pink-dark text-white font-semibold py-4 px-12 rounded-full text-lg transition-all active:scale-95"
        >
          Enter Screening
        </button>
      </div>
    </div>
  );
}
