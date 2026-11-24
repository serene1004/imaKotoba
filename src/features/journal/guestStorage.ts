import type { StoredEntry } from '../../types/journal';

export type GuestStorageError = 'corrupt' | 'read' | 'write' | null;
export type GuestStorageResult = { entries: StoredEntry[]; error: GuestStorageError };

export function isStoredEntry(value: unknown, emotionLabels: string[]): value is StoredEntry {
  if (value === null || typeof value !== 'object') return false;
  const entry = value as Partial<StoredEntry>;
  return typeof entry.id === 'string'
    && typeof entry.emotion_label === 'string'
    && emotionLabels.includes(entry.emotion_label)
    && typeof entry.japanese === 'string'
    && entry.japanese.trim().length > 0
    && entry.japanese.length <= 150
    && (entry.korean === null || (typeof entry.korean === 'string' && entry.korean.length <= 150))
    && typeof entry.created_at === 'string'
    && Number.isFinite(Date.parse(entry.created_at));
}

export function readGuestEntries(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  emotionLabels: string[],
): GuestStorageResult {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { entries: [], error: null };

    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries) || !entries.every((entry) => isStoredEntry(entry, emotionLabels))) {
      return { entries: [], error: 'corrupt' };
    }

    return { entries, error: null };
  } catch {
    return { entries: [], error: 'read' };
  }
}

export function saveGuestEntry(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  entry: StoredEntry,
  emotionLabels: string[],
): GuestStorageResult {
  const result = readGuestEntries(storage, key, emotionLabels);
  if (result.error) return result;

  const entries = [entry, ...result.entries];
  try {
    storage.setItem(key, JSON.stringify(entries));
    return { entries, error: null };
  } catch {
    return { entries: result.entries, error: 'write' };
  }
}

export function deleteGuestEntry(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  entryId: string,
  emotionLabels: string[],
): GuestStorageResult {
  const result = readGuestEntries(storage, key, emotionLabels);
  if (result.error) return result;

  const entries = result.entries.filter((entry) => entry.id !== entryId);
  try {
    storage.setItem(key, JSON.stringify(entries));
    return { entries, error: null };
  } catch {
    return { entries: result.entries, error: 'write' };
  }
}
