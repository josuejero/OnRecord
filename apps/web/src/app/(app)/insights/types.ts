export type TopTerm = { term: string; count: number };

export type SessionInsightRow = {
  computed_at: string;
  questions_total: number | null;
  questions_answered: number | null;
  questions_rejected: number | null;
  rejection_rate: number | null;
  avg_time_to_answer_seconds: number | null;
  transcript_word_count: number | null;
  top_terms: TopTerm[] | null;
};

export type PublicFigureRow = {
  name: string;
  slug: string;
};

export type RoomRow = {
  title: string;
  slug: string;
  public_figures?: PublicFigureRow[] | null;
};

export type InsightsSessionRow = {
  id: string;
  status: string;
  rooms?: RoomRow[] | null;
  session_insights?: SessionInsightRow[] | null;
};
