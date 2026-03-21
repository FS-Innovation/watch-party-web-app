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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant/50">
            Loading your experience...
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-sm">
          <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary mb-3">
            private screening
          </p>
          <h1 className="font-headline font-bold text-3xl uppercase tracking-tighter text-on-surface mb-4">
            BTD
          </h1>
          <p className="font-body text-sm text-on-surface-variant/60 mb-8">
            {error || "Please use the link sent to your phone to access this screening."}
          </p>
          <div className="w-12 h-px bg-outline-variant/20 mx-auto" />
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
