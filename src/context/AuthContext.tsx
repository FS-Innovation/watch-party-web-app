"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Registration } from "@/types/database";

interface AuthContextType {
  user: Registration | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      // Dev bypass: allow access without a magic link in development
      if (process.env.NODE_ENV === "development") {
        setUser({
          id: "dev-user-00000000",
          first_name: "Dev",
          last_name: "User",
          email: "dev@localhost",
          phone: "",
          location: "Local",
          magic_token: "dev-bypass",
          ticket_number: 0,
          avatar_url: null,
          created_at: new Date().toISOString(),
        });
        sessionStorage.setItem("magic_token", "dev-bypass");
        setLoading(false);
        return;
      }
      setError("No access token provided. Please use the link sent to your phone.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data.user);
      // Store token for subsequent API calls
      sessionStorage.setItem("magic_token", token);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if already authenticated
    const storedToken = sessionStorage.getItem("magic_token");
    if (storedToken && !new URLSearchParams(window.location.search).get("token")) {
      // Re-auth with stored token
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: storedToken }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUser(data.user);
          else setError("Session expired. Please use your link again.");
        })
        .catch(() => setError("Connection error."))
        .finally(() => setLoading(false));
    } else {
      authenticate();
    }
  }, [authenticate]);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
