export type Phase = "pre-screening" | "part-1" | "half-time" | "part-2" | "post-screening";
export type Visibility = "name" | "anonymous" | "optout";
export type ModeratorStatus = "pending" | "approved" | "starred" | "rejected";

export interface Database {
  public: {
    Tables: {
      registrations: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          location: string;
          magic_token: string;
          ticket_number: number;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["registrations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["registrations"]["Insert"]>;
      };
      watch_party_sessions: {
        Row: {
          id: string;
          event_id: string;
          current_phase: Phase;
          started_at: string | null;
          ended_at: string | null;
          attendee_count: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["watch_party_sessions"]["Row"], "id" | "created_at" | "attendee_count">;
        Update: Partial<Database["public"]["Tables"]["watch_party_sessions"]["Insert"]>;
      };
      poll_questions: {
        Row: {
          id: string;
          session_id: string;
          question_text: string;
          options: string[];
          poll_type: string;
          display_order: number;
          triggered_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["poll_questions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["poll_questions"]["Insert"]>;
      };
      poll_responses: {
        Row: {
          id: string;
          registration_id: string;
          poll_id: string;
          answer: string;
          responded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["poll_responses"]["Row"], "id" | "responded_at">;
        Update: Partial<Database["public"]["Tables"]["poll_responses"]["Insert"]>;
      };
      conversation_cards: {
        Row: {
          id: string;
          session_id: string;
          card_image_url: string;
          prompt_text: string;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversation_cards"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversation_cards"]["Insert"]>;
      };
      conversation_card_responses: {
        Row: {
          id: string;
          registration_id: string;
          card_id: string;
          answer_text: string;
          visibility: Visibility;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversation_card_responses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversation_card_responses"]["Insert"]>;
      };
      photobooth_entries: {
        Row: {
          id: string;
          registration_id: string;
          session_id: string;
          image_url: string;
          shared_to: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["photobooth_entries"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["photobooth_entries"]["Insert"]>;
      };
      live_questions: {
        Row: {
          id: string;
          registration_id: string;
          session_id: string;
          question: string;
          ai_approved: boolean;
          moderator_status: ModeratorStatus;
          ai_topic: string | null;
          ai_duplicate_of: string | null;
          upvote_count: number;
          submitted_at: string;
          answered_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["live_questions"]["Row"], "id" | "submitted_at" | "upvote_count">;
        Update: Partial<Database["public"]["Tables"]["live_questions"]["Insert"]>;
      };
      question_upvotes: {
        Row: {
          id: string;
          registration_id: string;
          question_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["question_upvotes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["question_upvotes"]["Insert"]>;
      };
      moment_captures: {
        Row: {
          id: string;
          registration_id: string;
          session_id: string;
          response: string;
          ai_theme: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["moment_captures"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["moment_captures"]["Insert"]>;
      };
      community_poll_responses: {
        Row: {
          id: string;
          registration_id: string;
          session_id: string;
          response: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["community_poll_responses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["community_poll_responses"]["Insert"]>;
      };
      attendance_signals: {
        Row: {
          id: string;
          registration_id: string;
          session_id: string;
          joined_at: string;
          last_active_at: string;
          total_interactions: number;
          engagement_score: number;
        };
        Insert: Omit<Database["public"]["Tables"]["attendance_signals"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["attendance_signals"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Helper types
export type Registration = Database["public"]["Tables"]["registrations"]["Row"];
export type Session = Database["public"]["Tables"]["watch_party_sessions"]["Row"];
export type PollQuestion = Database["public"]["Tables"]["poll_questions"]["Row"];
export type PollResponse = Database["public"]["Tables"]["poll_responses"]["Row"];
export type ConversationCard = Database["public"]["Tables"]["conversation_cards"]["Row"];
export type ConversationCardResponse = Database["public"]["Tables"]["conversation_card_responses"]["Row"];
export type PhotoboothEntry = Database["public"]["Tables"]["photobooth_entries"]["Row"];
export type LiveQuestion = Database["public"]["Tables"]["live_questions"]["Row"];
export type QuestionUpvote = Database["public"]["Tables"]["question_upvotes"]["Row"];
export type MomentCapture = Database["public"]["Tables"]["moment_captures"]["Row"];
export type CommunityPollResponse = Database["public"]["Tables"]["community_poll_responses"]["Row"];
export type AttendanceSignal = Database["public"]["Tables"]["attendance_signals"]["Row"];
