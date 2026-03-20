"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session, Phase } from "@/types/database";

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
    try {
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
    fetchSession();

    // Subscribe to realtime changes
    const channel = supabase
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

    // Polling fallback
    intervalRef.current = setInterval(fetchSession, POLL_INTERVAL);

    return () => {
      channel.unsubscribe();
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
