# PRD: Guest Viewer vs Registered User

> **Build trigger:** Only implement once Twilio is confirmed and magic link auth flow is live. Until then, the current open-access guest bypass is sufficient for team previewing.

## Overview

Anyone can visit the app URL. Registered users (authenticated via magic link) get the full interactive experience. Guest viewers get a **read-only / limited experience** — they can see the screening but can't participate in everything.

This creates a natural incentive to register while still allowing shared links to work without breaking the experience.

## Current State (Pre-Twilio)

- Magic link auth is **temporarily bypassed** in `src/context/AuthContext.tsx`
- All visitors enter as "Guest Viewer" with a synthetic user object (`id: "guest-user-00000000"`)
- Server-side API routes already reject guest tokens — `authenticateToken()` won't find `"guest-bypass"` in the database, so guests can't submit data even if they try
- This is intentional for team preview during development

## Feature Access Matrix

| Feature | Registered User | Guest Viewer |
|---------|----------------|--------------|
| **Polls** — View questions & results | Yes | Yes |
| **Polls** — Vote | Yes | No — show "Register to vote" CTA |
| **Cards** — Read prompts | Yes | Yes |
| **Cards** — Submit answer | Yes | No — show "Register to participate" CTA |
| **Cards** — View others' answers | Yes | Yes |
| **Q&A** — Read approved questions | Yes | Yes |
| **Q&A** — Submit a question | Yes | No — show CTA |
| **Q&A** — Upvote questions | Yes | No |
| **Booth** — Take photo | Yes (frame shows ticket #) | Yes (frame shows "GUEST") |
| **Booth** — Download / Share to socials | Yes | Yes |
| **Booth** — Save to server | Yes | No |
| **Me** — Full profile & screening receipt | Yes | Simplified view with register CTA |
| **Attendance tracking** | Yes (recorded in DB) | No |
| **Post-screening takeover** | Yes (moment capture, community poll) | View-only |

## Implementation Plan

### 1. Auth Context — `isGuest` flag

Add a computed `isGuest` boolean to the auth context so all components can check user type without hardcoding ID checks everywhere.

**File:** `src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: Registration | null;
  isGuest: boolean;  // <-- new
  loading: boolean;
  error: string | null;
}
```

Logic: `isGuest = user?.id?.startsWith("guest-") ?? false`

### 2. Guest Badge UI

Show a small "Guest" chip/badge in the app header or tab bar so guest users always know their status. Keep it subtle — not a blocker, just informational.

### 3. Feature Gates in Tab Components

Wrap interactive elements (submit buttons, text inputs, vote buttons) with `isGuest` checks. When a guest tries to interact:

- Don't silently disable — show a **soft CTA** instead
- Example: "Get your invite to participate" or "Register for the full experience"
- Link to the registration page or show a message like "Ask your host for an invite"
- Keep the surrounding UI visible so guests can still see what the feature looks like

**Files to update:**
- `src/components/tabs/PollsTab.tsx` — gate vote buttons
- `src/components/tabs/CardsTab.tsx` — gate answer submission
- `src/components/tabs/QATab.tsx` — gate question submission and upvote
- `src/components/tabs/BoothTab.tsx` — change frame overlay for guests
- `src/components/tabs/MeTab.tsx` — simplified guest profile view

### 4. Booth Frame for Guests

In `BoothTab.tsx`, the `drawFrame()` function currently renders the user's ticket number in the top-right corner. For guests:

- Replace `#0000` with `GUEST` text
- Optionally use a slightly different frame style to differentiate

### 5. Me Tab — Guest View

Instead of showing a full profile card with name/location/ticket number, show:

- "You're viewing as a Guest"
- A CTA to register
- Still show any photos they took (client-side only, won't persist)
- Hide the screening receipt / activity tracker sections

### 6. Server-Side Protection (Already Done)

All API routes use `authenticateToken()` which queries the `registrations` table by `magic_token`. The guest bypass token (`"guest-bypass"`) doesn't exist in the database, so:

- POST `/api/polls/respond` → 401
- POST `/api/cards/respond` → 401
- POST `/api/qa/submit` → 401
- POST `/api/qa/upvote` → 401
- POST `/api/photobooth/save` → 401
- POST `/api/moments/capture` → 401
- POST `/api/community-poll/respond` → 401

No server-side changes needed — guests are already blocked from writing data.

### 7. Analytics Differentiation

Guest visits can be tracked separately:
- Guest users have `id: "guest-user-00000000"` — easy to filter in queries
- Registered users have real UUIDs from the `registrations` table
- Useful for: "How many people visited vs how many were registered attendees?"

## What This Gives You

- **Team preview works** — stakeholders can see the full app in production without magic links
- **Shared links don't break** — if a registered user shares the URL, the recipient still sees the experience
- **Clear differentiation** — guest vs registered is visible in both the UI and the data
- **Soft registration funnel** — guests see CTAs to register, creating organic demand
- **Zero risk** — server already blocks guest writes, so no bad data gets in

## Re-enabling Full Auth

When Twilio is confirmed and magic links are live:

1. Remove the guest bypass block in `src/context/AuthContext.tsx` (the `if (!token)` block that sets the guest user)
2. Restore the original error message for unauthenticated visitors
3. The guest viewer feature gates remain — they'll just never trigger for magic-link authenticated users

Alternatively, keep the guest bypass as a permanent feature if you want the app to always be viewable by non-registered visitors.

## Files Reference

| File | Role |
|------|------|
| `src/context/AuthContext.tsx` | Auth context, guest bypass, `isGuest` flag |
| `src/components/TabBar.tsx` | Optional guest badge placement |
| `src/components/tabs/PollsTab.tsx` | Gate vote buttons |
| `src/components/tabs/CardsTab.tsx` | Gate answer submission |
| `src/components/tabs/QATab.tsx` | Gate question + upvote |
| `src/components/tabs/BoothTab.tsx` | Guest frame overlay |
| `src/components/tabs/MeTab.tsx` | Guest profile view |
| `src/lib/auth.ts` | `authenticateToken()` — already blocks guests server-side |
