"use client";

import React from "react";
import { useSession } from "@/context/SessionContext";

export type TabId = "booth" | "cards" | "polls" | "qa" | "me";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "booth",
    label: "Booth",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    id: "cards",
    label: "Cards",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
      </svg>
    ),
  },
  {
    id: "polls",
    label: "Polls",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: "qa",
    label: "Q&A",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    id: "me",
    label: "Me",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { phase } = useSession();

  const isTabAvailable = (tabId: TabId): boolean => {
    switch (tabId) {
      case "booth":
      case "me":
        return true; // Always available
      case "cards":
        return ["pre-screening", "half-time"].includes(phase);
      case "polls":
        return ["half-time", "part-2", "post-screening"].includes(phase);
      case "qa":
        return ["part-1", "half-time", "part-2"].includes(phase);
      default:
        return true;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const available = isTabAvailable(tab.id);
          const active = activeTab === tab.id;
          const isPollsCenter = tab.id === "polls";

          return (
            <button
              key={tab.id}
              onClick={() => available && onTabChange(tab.id)}
              disabled={!available}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                active
                  ? "text-pink"
                  : available
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-700 cursor-not-allowed"
              } ${isPollsCenter ? "relative" : ""}`}
            >
              {isPollsCenter && (
                <div
                  className={`absolute -top-3 w-12 h-12 rounded-full flex items-center justify-center ${
                    active ? "bg-pink" : available ? "bg-gray-700" : "bg-gray-800"
                  }`}
                >
                  <div className={active ? "text-white" : available ? "text-gray-300" : "text-gray-600"}>
                    {tab.icon}
                  </div>
                </div>
              )}
              {!isPollsCenter && tab.icon}
              <span className={`text-[10px] mt-1 ${isPollsCenter ? "mt-6" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
