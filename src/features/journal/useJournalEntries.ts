import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import emotions from '../../data/emotions';
import supabase from '../../lib/supabase';
import type { Entry, StoredEntry } from '../../types/journal';
import { deleteGuestEntry, readGuestEntries, saveGuestEntry } from './guestStorage';
import { getLocalDayKey } from './journalSelectors';

const guestEntriesKey = 'ima-kotoba:guest-entries';
const emotionLabels = emotions.map((item) => item.label);

function toEntry(entry: StoredEntry): Entry {
  const createdAt = new Date(entry.created_at);
  return {
    id: entry.id,
    time: new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(createdAt),
    dayKey: getLocalDayKey(createdAt),
    dayLabel: new Intl.DateTimeFormat('ko-KR', {
      month: 'long',
      day: 'numeric',
    }).format(createdAt),
    emotion: emotions.find((item) => item.label === entry.emotion_label) ?? emotions[2],
    japanese: entry.japanese,
    korean: entry.korean ?? '',
  };
}

export default function useJournalEntries(session: Session | null) {
  const identity = session?.user.id ?? 'guest';
  const isGuest = !session;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const loadSequence = useRef(0);
  const mounted = useRef(true);
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;

  const isCurrent = (sequence: number, requestIdentity: string) => (
    mounted.current
    && sequence === loadSequence.current
    && activeIdentity.current === requestIdentity
  );
  const isIdentityCurrent = (requestIdentity: string) => (
    mounted.current && activeIdentity.current === requestIdentity
  );

  const loadEntries = async () => {
    const requestIdentity = identity;
    const sequence = loadSequence.current + 1;
    loadSequence.current = sequence;
    setPending(true);
    setLoadError('');

    try {
      if (isGuest) {
        const result = readGuestEntries(localStorage, guestEntriesKey, emotionLabels);
        if (!isCurrent(sequence, requestIdentity)) return false;
        if (result.error) {
          setLoadError(result.error === 'corrupt'
            ? '체험 기록 형식을 읽을 수 없습니다. 기존 데이터는 보존했으며 새 기록을 저장하지 않았습니다.'
            : '체험 기록을 읽지 못했습니다. 브라우저 저장 공간을 확인해주세요.');
          return false;
        }
        setEntries(result.entries.map(toEntry));
        return true;
      }

      const { data, error: queryError } = await supabase
        .from('journal_entries')
        .select('id, emotion_label, japanese, korean, created_at')
        .order('created_at', { ascending: false });
      if (!isCurrent(sequence, requestIdentity)) return false;
      if (queryError) {
        setLoadError('기록을 불러오지 못했습니다. 연결 상태와 Supabase 설정을 확인해주세요.');
        return false;
      }
      setEntries(data.map(toEntry));
      return true;
    } catch {
      if (isCurrent(sequence, requestIdentity)) {
        setLoadError(isGuest
          ? '체험 기록을 불러오지 못했습니다. 브라우저 저장 공간을 확인해주세요.'
          : '기록을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.');
      }
      return false;
    } finally {
      if (isCurrent(sequence, requestIdentity)) setPending(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    loadEntries();
    return () => {
      loadSequence.current += 1;
      if (activeIdentity.current === identity) mounted.current = false;
    };
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEntry = async (japanese: string, korean: string, emotionLabel: string) => {
    const requestIdentity = identity;
    setSaving(true);
    setSaveError('');

    try {
      const newEntry: StoredEntry = {
        id: crypto.randomUUID(),
        emotion_label: emotionLabel,
        japanese: japanese.trim(),
        korean: korean.trim() || null,
        created_at: new Date().toISOString(),
      };

      if (isGuest) {
        const result = saveGuestEntry(localStorage, guestEntriesKey, newEntry, emotionLabels);
        if (!isIdentityCurrent(requestIdentity)) return false;
        if (result.error) {
          if (result.error === 'corrupt') {
            setSaveError('체험 기록 형식을 읽을 수 없습니다. 기존 데이터는 보존했으며 새 기록을 저장하지 않았습니다.');
          } else if (result.error === 'write') {
            setSaveError('브라우저 저장 공간이 부족해 기록을 저장하지 못했습니다. 저장 공간을 확인해주세요.');
          } else {
            setSaveError('체험 기록을 읽지 못했습니다. 기존 데이터는 보존했으며 새 기록을 저장하지 않았습니다.');
          }
          return false;
        }
        setEntries(result.entries.map(toEntry));
        setLoadError('');
        return true;
      }

      const { error: insertError } = await supabase.from('journal_entries').insert({
        user_id: session.user.id,
        emotion_label: newEntry.emotion_label,
        japanese: newEntry.japanese,
        korean: newEntry.korean,
      });
      if (!isIdentityCurrent(requestIdentity)) return false;
      if (insertError) {
        setSaveError('기록을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return false;
      }

      const loaded = await loadEntries();
      if (!isIdentityCurrent(requestIdentity)) return false;
      if (!loaded) setLoadError('기록은 저장했지만 목록을 다시 불러오지 못했습니다. 다시 시도해주세요.');
      return true;
    } catch {
      if (activeIdentity.current === requestIdentity && mounted.current) {
        setSaveError(isGuest
          ? '브라우저 저장 공간을 사용할 수 없어 기록을 저장하지 못했습니다.'
          : '기록을 저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.');
      }
      return false;
    } finally {
      if (activeIdentity.current === requestIdentity && mounted.current) setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    const requestIdentity = identity;
    setDeletingEntryId(entryId);
    setDeleteError('');

    try {
      if (isGuest) {
        const result = deleteGuestEntry(localStorage, guestEntriesKey, entryId, emotionLabels);
        if (!isIdentityCurrent(requestIdentity)) return false;
        if (result.error) {
          setDeleteError(result.error === 'write'
            ? '브라우저 저장 공간을 사용할 수 없어 기록을 삭제하지 못했습니다.'
            : '체험 기록을 읽을 수 없어 삭제하지 못했습니다. 기존 데이터는 보존했습니다.');
          return false;
        }
        setEntries(result.entries.map(toEntry));
        setLoadError('');
        return true;
      }

      const { error: deleteRequestError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);
      if (!isIdentityCurrent(requestIdentity)) return false;
      if (deleteRequestError) {
        setDeleteError('기록을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return false;
      }
      setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId));
      setLoadError('');
      return true;
    } catch {
      if (activeIdentity.current === requestIdentity && mounted.current) {
        setDeleteError('기록을 삭제하지 못했습니다. 저장 공간과 연결 상태를 확인해주세요.');
      }
      return false;
    } finally {
      if (activeIdentity.current === requestIdentity && mounted.current) setDeletingEntryId(null);
    }
  };

  const clearDeleteError = () => setDeleteError('');

  return {
    entries,
    pending,
    saving,
    deletingEntryId,
    loadError,
    saveError,
    deleteError,
    loadEntries,
    saveEntry,
    deleteEntry,
    clearDeleteError,
  };
}
