export const LABEL_TYPES = [
  'symptom',
  'medication',
  'caregiver_task',
  'mood_sentiment',
  'appointment',
  'safety_risk'
] as const;

export type LabelType = (typeof LABEL_TYPES)[number];

export type LabelRow = {
  id: string;
  session_id: string;
  transcript_id: string;
  start_offset: number;
  end_offset: number;
  label_type: LabelType;
  label_value: string | null;
  created_at: string;
};
