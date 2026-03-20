"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SessionProvider, useSession } from "@/context/SessionContext";
import WelcomeScreen from "@/components/WelcomeScreen";
import TabBar, { type TabId } from "@/components/TabBar";
import PostScreeningTakeover from "@/components/PostScreeningTakeover";
import PollsTab from "@/components/tabs/PollsTab";
import CardsTab from "@/components/tabs/CardsTab";
import BoothTab from "@/components/tabs/BoothTab";
import QATab from "@/components/tabs/QATab";
import MeTab from "@/components/tabs/MeTab";

function AppContent() {
  const { user, loading, error } = useAuth();
  const { phase } = useSession();
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("polls");
  const [showTakeover, setShowTakeover] = useState(false);
  const [takeoverDismissed, setTakeoverDismissed] = useState(false);

  // Show post-screening takeover when phase changes
  React.useEffect(() => {
    if (phase === "post-screening" && !takeoverDismissed) {
      setShowTakeover(true);
    }
  }, [phase, takeoverDismissed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your experience...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="font-serif text-2xl text-foreground mb-3">
            BTD Private Screening
          </h1>
          <p className="text-gray-400 mb-6">
            {error || "Please use the link sent to your phone to access this screening."}
          </p>
          <div className="w-12 h-[1px] bg-border mx-auto" />
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onEnter={() => setShowWelcome(false)} />;
  }

  if (showTakeover) {
    return (
      <PostScreeningTakeover
        onComplete={() => {
          setShowTakeover(false);
          setTakeoverDismissed(true);
          setActiveTab("me");
        }}
      />
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "booth":
        return <BoothTab />;
      case "cards":
        return <CardsTab />;
      case "polls":
        return <PollsTab />;
      case "qa":
        return <QATab />;
      case "me":
        return <MeTab />;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {renderTab()}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </AuthProvider>
  );
}
