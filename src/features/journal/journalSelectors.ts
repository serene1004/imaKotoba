import type {
  Emotion,
  EmotionStat,
  Entry,
  HistoryGroup,
  WeeklyDay,
} from '../../types/journal';

export function getLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function selectWeeklyDays(entries: Entry[], today: Date): WeeklyDay[] {
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const counts = new Map<string, number>();
  entries.forEach((entry) => counts.set(entry.dayKey, (counts.get(entry.dayKey) ?? 0) + 1));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = getLocalDayKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat('ko-KR', { weekday: 'narrow' }).format(date),
      count: counts.get(key) ?? 0,
    };
  });
}

export function selectEmotionStats(
  entries: Entry[],
  days: WeeklyDay[],
  emotions: Emotion[],
): EmotionStat[] {
  const dayKeys = new Set(days.map((day) => day.key));
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    if (dayKeys.has(entry.dayKey)) {
      counts.set(entry.emotion.label, (counts.get(entry.emotion.label) ?? 0) + 1);
    }
  });

  return emotions
    .map((emotion) => ({ ...emotion, count: counts.get(emotion.label) ?? 0 }))
    .filter((emotion) => emotion.count > 0)
    .sort((first, second) => second.count - first.count);
}

export function groupEntriesByDay(entries: Entry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();
  entries.forEach((entry) => {
    const group = groups.get(entry.dayKey);
    if (group) group.entries.push(entry);
    else {
      groups.set(entry.dayKey, {
        dayKey: entry.dayKey,
        dayLabel: entry.dayLabel,
        entries: [entry],
      });
    }
  });
  return Array.from(groups.values());
}
