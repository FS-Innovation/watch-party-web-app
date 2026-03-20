"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Session, Phase } from "@/types/database";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_SESSION: Session = {
  id: "demo-session-001",
  event_id: "btd-private-screening",
  current_phase: "pre-screening",
  started_at: new Date().toISOString(),
  ended_at: null,
  attendee_count: 3247,
  created_at: new Date().toISOString(),
};

interface SessionContextType {
  session: Session | null;
  phase: Phase;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  phase: "pre-screening",
  loading: true,
});

const POLL_INTERVAL = 5000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async () => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION);
      setLoading(false);
      return;
    }

    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data, error } = await supabase
        .from("watch_party_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setSession(data as Session);
      }
    } catch {
      // Silently handle - will retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION);
      setLoading(false);
      return;
    }

    fetchSession();

    // Subscribe to realtime changes (only when not in demo mode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    import("@/lib/supabase/client").then(({ supabase }) => {
      channel = supabase
        .channel("session-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "watch_party_sessions",
          },
          (payload) => {
            if (payload.new) {
              setSession(payload.new as Session);
            }
          }
        )
        .subscribe();
    });

    // Polling fallback
    intervalRef.current = setInterval(fetchSession, POLL_INTERVAL);

    return () => {
      if (channel) channel.unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSession]);

  const phase = (session?.current_phase || "pre-screening") as Phase;

  return (
    <SessionContext.Provider value={{ session, phase, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
