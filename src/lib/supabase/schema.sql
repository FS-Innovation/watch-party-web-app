-- Watch Party Web App Schema
-- Run this against your Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Registrations table (pre-existing, included for reference)
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  magic_token TEXT NOT NULL UNIQUE,
  ticket_number SERIAL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_magic_token ON registrations(magic_token);

-- Watch Party Sessions
CREATE TABLE watch_party_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  current_phase TEXT NOT NULL DEFAULT 'pre-screening'
    CHECK (current_phase IN ('pre-screening', 'part-1', 'half-time', 'part-2', 'post-screening')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  attendee_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Questions
CREATE TABLE poll_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  poll_type TEXT NOT NULL DEFAULT 'experience',
  display_order INTEGER NOT NULL DEFAULT 0,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poll_questions_session ON poll_questions(session_id);

-- Poll Responses
CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES poll_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, poll_id)
);

CREATE INDEX idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX idx_poll_responses_registration ON poll_responses(registration_id);

-- Conversation Cards
CREATE TABLE conversation_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  card_image_url TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Card Responses
CREATE TABLE conversation_card_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES conversation_cards(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'anonymous'
    CHECK (visibility IN ('name', 'anonymous', 'optout')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, card_id)
);

CREATE INDEX idx_card_responses_card ON conversation_card_responses(card_id);

-- Photobooth Entries
CREATE TABLE photobooth_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  shared_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Questions (Ask Steven)
CREATE TABLE live_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ai_approved BOOLEAN DEFAULT FALSE,
  moderator_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderator_status IN ('pending', 'approved', 'starred', 'rejected')),
  ai_topic TEXT,
  ai_duplicate_of UUID REFERENCES live_questions(id),
  upvote_count INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX idx_live_questions_session ON live_questions(session_id);
CREATE INDEX idx_live_questions_status ON live_questions(moderator_status);

-- Question Upvotes
CREATE TABLE question_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, question_id)
);

-- Moment Captures
CREATE TABLE moment_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  ai_theme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, session_id)
);

-- Community Poll Responses
CREATE TABLE community_poll_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, session_id)
);

-- Attendance Signals
CREATE TABLE attendance_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES watch_party_sessions(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  total_interactions INTEGER DEFAULT 0,
  engagement_score REAL DEFAULT 0,
  UNIQUE(registration_id, session_id)
);

-- RLS Policies
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_party_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_card_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobooth_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_signals ENABLE ROW LEVEL SECURITY;

-- Public read for sessions (everyone needs phase info)
CREATE POLICY "Sessions are publicly readable" ON watch_party_sessions FOR SELECT USING (true);

-- Public read for poll questions
CREATE POLICY "Poll questions are publicly readable" ON poll_questions FOR SELECT USING (true);

-- Public read for conversation cards
CREATE POLICY "Conversation cards are publicly readable" ON conversation_cards FOR SELECT USING (true);

-- Anon can read approved live questions
CREATE POLICY "Approved questions are publicly readable" ON live_questions
  FOR SELECT USING (ai_approved = true AND moderator_status IN ('approved', 'starred'));

-- Anon can read visible card responses
CREATE POLICY "Visible card responses are readable" ON conversation_card_responses
  FOR SELECT USING (visibility != 'optout');

-- Allow inserts via service role (API routes handle auth)
-- For client-side, we use API routes that validate magic_token

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE watch_party_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE live_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE question_upvotes;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_card_responses;
