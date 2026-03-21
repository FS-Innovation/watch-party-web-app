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

  return (
    <div className="fixed inset-0 bg-[#000000] flex flex-col overflow-hidden z-40">
      {/* Atmosphere Gradient — blurred street lights */}
      <div className="fixed top-0 left-0 w-full h-[530px] pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary-container/20 blur-[120px] rounded-full" />
        <div className="absolute top-[5%] right-[-5%] w-[40%] h-[50%] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <main
        className={`relative z-10 min-h-screen flex flex-col px-6 pt-12 pb-10 transition-all duration-1000 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Top Status */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-tertiary-container shadow-[0_0_12px_#9b1c31] animate-pulse" />
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70">
              {attendeeCount > 0
                ? `${attendeeCount.toLocaleString()} watching now`
                : "Live now"}
            </span>
          </div>
          <div className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50">
            LOBBY // OPEN
          </div>
        </div>

        {/* Editorial Headline */}
        <header className="flex-grow flex flex-col justify-start pt-8">
          <h1 className="font-headline font-extrabold text-[clamp(3.5rem,15vw,8rem)] leading-[0.85] tracking-tighter text-on-surface uppercase mb-6">
            WELCOME
            <br />
            BACK,
            <br />
            {user?.first_name?.toUpperCase() || "GUEST"}
          </h1>
          <p className="font-body text-lg font-light text-on-surface-variant max-w-[280px] leading-relaxed">
            {attendeeCount > 0
              ? `You are 1 of ${attendeeCount.toLocaleString()} here tonight.`
              : "Your private screening awaits."}
          </p>
        </header>

        {/* Event Credential Card */}
        <section className="my-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary-container/5 blur-2xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-[#111111] border border-outline-variant/15 p-8 rounded-lg overflow-hidden backdrop-blur-sm">
              <div className="flex flex-col gap-8">
                <div>
                  <span className="font-cursive text-3xl text-secondary mb-1 block transform -rotate-2 origin-left">
                    Private Screening
                  </span>
                  <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface uppercase leading-none">
                    BTD: THE MIDNIGHT GALLERY
                  </h2>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="font-label text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/40">
                      Credential ID
                    </p>
                    <p className="font-mono text-sm tracking-widest text-primary">
                      #BTD-{String(user?.ticket_number || 0).padStart(4, "0")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-label text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/40">
                      Tier
                    </p>
                    <p className="font-label text-xs font-semibold tracking-widest text-secondary">
                      PREMIUM GUEST
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative ticket icon */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  confirmation_number
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Enter Button */}
        <footer className="mt-auto">
          <button
            onClick={onEnter}
            className="w-full group relative flex items-center justify-between p-6 bg-gradient-to-r from-primary-container to-transparent border border-primary-container/30 rounded-sm overflow-hidden active:scale-[0.98] transition-all duration-300"
          >
            <span className="font-label text-sm font-semibold uppercase tracking-[0.25em] text-on-primary-container">
              ENTER SCREENING
            </span>
            <span className="material-symbols-outlined text-on-primary-container group-hover:translate-x-1 transition-transform duration-300">
              arrow_right_alt
            </span>
          </button>
          <div className="mt-6 flex justify-center">
            <p className="font-label text-[9px] uppercase tracking-[0.4em] text-on-surface-variant/30">
              EST. 2024 &copy; BEYOND THE DIGITAL
            </p>
          </div>
        </footer>
      </main>

      {/* Bottom glow */}
      <div className="fixed bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-tertiary-container/5 blur-[80px] rounded-full z-0 pointer-events-none" />
    </div>
  );
}
