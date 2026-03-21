"use client";

import React from "react";
import { useSession } from "@/context/SessionContext";

export type TabId = "booth" | "cards" | "polls" | "qa" | "me";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "booth", label: "BOOTH", icon: "confirmation_number" },
  { id: "cards", label: "CARDS", icon: "layers" },
  { id: "polls", label: "POLLS", icon: "poll" },
  { id: "qa", label: "Q&A", icon: "mic" },
  { id: "me", label: "ME", icon: "person" },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { phase } = useSession();

  // TODO: Re-enable phase gating for live event
  // For now, all tabs available so the team can preview the full experience
  const isTabAvailable = (_tabId: TabId): boolean => {
    void phase; // suppress unused warning
    return true;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-2xl border-t border-outline-variant/15 pt-3 px-4 shadow-[0_-10px_40px_rgba(26,107,122,0.1)]" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const available = isTabAvailable(tab.id);
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => available && onTabChange(tab.id)}
              disabled={!available}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                active
                  ? "text-secondary scale-105"
                  : available
                  ? "text-on-surface-variant/60 hover:text-primary"
                  : "text-on-surface-variant/20 cursor-not-allowed"
              }`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={
                  active
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {tab.icon}
              </span>
              <span className="font-label text-[10px] uppercase tracking-[0.15em] font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
