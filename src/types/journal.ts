export type Emotion = { icon: string; label: string };
export type Entry = {
  id: string;
  time: string;
  dayKey: string;
  dayLabel: string;
  emotion: Emotion;
  japanese: string;
  korean: string;
};
export type StoredEntry = {
  id: string;
  emotion_label: string;
  japanese: string;
  korean: string | null;
  created_at: string;
};
export type EmotionStat = Emotion & { count: number };
export type HistoryGroup = { dayKey: string; dayLabel: string; entries: Entry[] };
export type WeeklyDay = { key: string; label: string; count: number };
