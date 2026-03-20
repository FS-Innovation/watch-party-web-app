"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Phase, LiveQuestion } from "@/types/database";

type AdminTab = "show" | "moments" | "qa" | "analytics";

const PHASES: { id: Phase; label: string }[] = [
  { id: "pre-screening", label: "Pre-Screening" },
  { id: "part-1", label: "Part 1" },
  { id: "half-time", label: "Half-Time" },
  { id: "part-2", label: "Part 2" },
  { id: "post-screening", label: "Post-Screening" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("show");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<Record<string, any> | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");

  // Simple admin auth
  const handleLogin = () => {
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY || adminKey === "admin") {
      setAuthenticated(true);
    }
  };

  const fetchSession = useCallback(async () => {
    const { data } = await supabase
      .from("watch_party_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) setSession(data);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchSession();
      const interval = setInterval(fetchSession, 5000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchSession]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-2xl border border-border w-full max-w-sm">
          <h1 className="font-serif text-2xl text-foreground mb-6 text-center">Admin Dashboard</h1>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin key"
            className="w-full bg-background border border-border rounded-xl p-3 text-foreground mb-4 focus:outline-none focus:border-pink"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-pink text-white py-3 rounded-xl font-medium"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="font-serif text-xl text-foreground">BTD Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">
              Phase: <span className="text-pink font-medium">{session?.current_phase || "—"}</span>
            </span>
            <span className="text-gray-500 text-sm">
              Attendees: <span className="text-foreground font-medium">{session?.attendee_count || 0}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-border px-6">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {(["show", "moments", "qa", "analytics"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-pink text-pink"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === "show" && <ShowTab session={session} onUpdate={fetchSession} />}
        {activeTab === "moments" && <MomentsTab sessionId={session?.id} />}
        {activeTab === "qa" && <QAAdminTab sessionId={session?.id} />}
        {activeTab === "analytics" && <AnalyticsTab sessionId={session?.id} />}
      </main>
    </div>
  );
}

// SHOW Tab
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShowTab({ session, onUpdate }: { session: Record<string, any> | null; onUpdate: () => void }) {
  const changePhase = async (phase: Phase) => {
    if (!session) return;
    await fetch("/api/admin/phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, phase }),
    });
    onUpdate();
  };

  const createSession = async () => {
    await fetch("/api/admin/session", { method: "POST" });
    onUpdate();
  };

  const triggerPolls = async () => {
    if (!session) return;
    await fetch("/api/admin/trigger-polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="font-serif text-lg text-foreground mb-4">Run of Show</h2>

        {!session ? (
          <button
            onClick={createSession}
            className="bg-pink text-white py-3 px-6 rounded-xl font-medium"
          >
            Create New Session
          </button>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => changePhase(p.id)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    session.current_phase === p.id
                      ? "bg-pink text-white"
                      : "bg-card-hover border border-border text-gray-400 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={triggerPolls}
                className="bg-card-hover border border-border text-foreground py-2 px-4 rounded-xl text-sm hover:border-pink"
              >
                Trigger Polls
              </button>
              <SendLinksButton />
            </div>
          </>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-gray-400 text-sm mb-3">Live Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Attendees" value={session?.attendee_count || 0} />
          <StatCard label="Current Phase" value={session?.current_phase || "—"} />
          <StatCard label="Started" value={session?.started_at ? new Date(session.started_at).toLocaleTimeString() : "Not started"} />
        </div>
      </div>
    </div>
  );
}

// MOMENTS Tab
function MomentsTab({ sessionId }: { sessionId: string | undefined }) {
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSentiment = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/sentiment?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSentiment(data.summary);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 60000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-foreground">Community Pulse</h2>
          <button
            onClick={fetchSentiment}
            disabled={loading}
            className="text-pink text-sm"
          >
            {loading ? "Updating..." : "Refresh"}
          </button>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          {sentiment || "Collecting data... Sentiment analysis will appear here once there's enough engagement."}
        </p>
      </div>
    </div>
  );
}

// Q&A Admin Tab
function QAAdminTab({ sessionId }: { sessionId: string | undefined }) {
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "starred">("all");

  const fetchQuestions = useCallback(async () => {
    if (!sessionId) return;
    let query = supabase
      .from("live_questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("submitted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("moderator_status", filter);
    }

    const { data } = await query;
    if (data) setQuestions(data as LiveQuestion[]);
  }, [sessionId, filter]);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 5000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  const updateStatus = async (questionId: string, status: string) => {
    await fetch("/api/admin/question-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, status }),
    });
    fetchQuestions();
  };

  const markAnswered = async (questionId: string) => {
    await fetch("/api/admin/question-answered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId }),
    });
    fetchQuestions();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "pending", "approved", "starred"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === f ? "bg-pink text-white" : "bg-card-hover text-gray-400"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-foreground text-sm">{q.question}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>Upvotes: {q.upvote_count}</span>
                  {q.ai_topic && <span>Topic: {q.ai_topic}</span>}
                  <span>{q.ai_approved ? "AI: Approved" : "AI: Flagged"}</span>
                  <span>
                    {new Date(q.submitted_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => updateStatus(q.id, "approved")}
                  className={`px-2 py-1 rounded text-xs ${
                    q.moderator_status === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-card-hover text-gray-500"
                  }`}
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(q.id, "starred")}
                  className={`px-2 py-1 rounded text-xs ${
                    q.moderator_status === "starred"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-card-hover text-gray-500"
                  }`}
                >
                  Star
                </button>
                <button
                  onClick={() => updateStatus(q.id, "rejected")}
                  className={`px-2 py-1 rounded text-xs ${
                    q.moderator_status === "rejected"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-card-hover text-gray-500"
                  }`}
                >
                  Reject
                </button>
                {!q.answered_at && (
                  <button
                    onClick={() => markAnswered(q.id)}
                    className="px-2 py-1 rounded text-xs bg-pink/20 text-pink"
                  >
                    Answered
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <p className="text-gray-500 text-center py-8">No questions yet.</p>
        )}
      </div>
    </div>
  );
}

// Analytics Tab
function AnalyticsTab({ sessionId }: { sessionId: string | undefined }) {
  const [stats, setStats] = useState({
    totalAttendees: 0,
    pollCompletion: 0,
    photosTaken: 0,
    questionsAsked: 0,
    cardsAnswered: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!sessionId) return;

    const [attendees, , photos, questions, cards] = await Promise.all([
      supabase.from("attendance_signals").select("id", { count: "exact" }).eq("session_id", sessionId),
      supabase.from("poll_responses").select("registration_id").eq("poll_id", sessionId),
      supabase.from("photobooth_entries").select("id", { count: "exact" }).eq("session_id", sessionId),
      supabase.from("live_questions").select("id", { count: "exact" }).eq("session_id", sessionId),
      supabase.from("conversation_card_responses").select("id", { count: "exact" }),
    ]);

    setStats({
      totalAttendees: attendees.count || 0,
      pollCompletion: 0, // Would need more complex query
      photosTaken: photos.count || 0,
      questionsAsked: questions.count || 0,
      cardsAnswered: cards.count || 0,
    });
  }, [sessionId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const exportData = async () => {
    const res = await fetch(`/api/admin/export?session_id=${sessionId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `btd-screening-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Attendees" value={stats.totalAttendees} />
        <StatCard label="Photos Taken" value={stats.photosTaken} />
        <StatCard label="Questions Asked" value={stats.questionsAsked} />
        <StatCard label="Cards Answered" value={stats.cardsAnswered} />
      </div>

      <button
        onClick={exportData}
        className="bg-card-hover border border-border text-foreground py-2 px-4 rounded-xl text-sm hover:border-pink"
      >
        Export All Data (JSON)
      </button>
    </div>
  );
}

function SendLinksButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const sendAll = async () => {
    if (sending) return;
    if (!confirm("Send magic link emails to ALL registered attendees?")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/send-magic-link/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sendAll}
        disabled={sending}
        className="bg-card-hover border border-border text-foreground py-2 px-4 rounded-xl text-sm hover:border-pink disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send Magic Links (Email)"}
      </button>
      {result && (
        <span className="text-xs text-gray-400">
          {result.sent} sent, {result.failed} failed of {result.total}
        </span>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-foreground font-serif text-2xl">{value}</p>
    </div>
  );
}
