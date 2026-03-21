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

## Screening Memories (Photobooth & Profile)

### Vision

Each watch party becomes a **memory** tied to a user's profile. When a registered user attends a screening, their photos, poll answers, card responses, and moments are all saved under their profile — a keepsake from the night. Think of it like a concert ticket stub, but digital and richer.

Over multiple screenings/watch parties, a user's profile becomes a collection of memories:

```
My Profile
├── BTD Private Screening — Mar 2026
│   ├── Step & Repeat photo
│   ├── 3 polls answered
│   ├── 1 question asked (and answered by Steven!)
│   └── Moment: "The twist at the end broke me"
├── Summer Watch Party — Jul 2026
│   ├── Step & Repeat photo
│   ├── 2 polls answered
│   └── Moment: "Best soundtrack of the year"
└── ...
```

### Guest Profile (Now — Local Only)

For guest viewers, the profile lives **entirely in the browser** via `localStorage`:

- Photos they take are stored as base64 data URLs in localStorage
- Their "screening receipt" is assembled from local state only
- Nothing persists across devices or browser clears
- The Me tab shows their locally-stored photo + a CTA: *"Register to keep your screening memories forever"*

**Implementation:**
- On photo capture: `localStorage.setItem("guest_photos", JSON.stringify([...]))`
- On Me tab load: read from localStorage and display
- No server calls for guests — everything is client-side

### Registered Profile (Future — Server-Persisted)

For registered users, everything is saved to Supabase and tied to their `registration_id`:

- **Photos** → Supabase Storage bucket, URL saved in `photobooth_entries`
- **Poll answers** → `poll_responses` (already works)
- **Card responses** → `conversation_card_responses` (already works)
- **Q&A questions** → `live_questions` (already works)
- **Moments** → `moment_captures` (already works)

The only missing piece is **actual photo storage** — currently the photobooth save endpoint is a stub. Needs:
1. Supabase Storage bucket (`screening-photos`)
2. Upload the base64 image, get back a public URL
3. Store the URL in `photobooth_entries.image_url`

### Multi-Event Profile (Future Future)

If this becomes a recurring watch party platform, the profile naturally extends:
- Each `watch_party_session` is an "event" the user attended
- The Me tab could show a timeline of past screenings
- Photos, responses, and moments are already scoped by `session_id` in the schema — so the data model already supports this
- Users build up a history: "I've been to 4 screenings"

### What This Unlocks

- **Shareability** — "Look at my screening receipt from last night" (screenshot-friendly)
- **Community** — profiles become a social proof of participation
- **Retention** — memories from past events bring people back for the next one
- **Registration incentive** — guests see what they're missing out on persisting

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
