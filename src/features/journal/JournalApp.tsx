import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import emotions from '../../data/emotions';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import JournalHeader from '../../components/journal/JournalHeader';
import JournalHome from '../../pages/JournalHome';
import JournalProfile from '../../pages/JournalProfile';
import JournalWrite from '../../pages/JournalWrite';
import {
  getLocalDayKey,
  groupEntriesByDay,
  selectEmotionStats,
  selectWeeklyDays,
} from './journalSelectors';
import useJournalEntries from './useJournalEntries';

type JournalAppProps = {
  session: Session | null;
  onExitGuest: () => void;
  onSignOut: () => Promise<string | null>;
};

const guestNameKey = 'ima-kotoba:guest-name';
const guestNames = ['하루', '나츠', '아키', '후유'];
function getGuestName(): string {
  const storedName = sessionStorage.getItem(guestNameKey);
  if (storedName && guestNames.includes(storedName)) return storedName;

  const name = guestNames[Math.floor(Math.random() * guestNames.length)];
  sessionStorage.setItem(guestNameKey, name);
  return name;
}

function JournalApp({ session, onExitGuest, onSignOut }: JournalAppProps) {
  const navigate = useNavigate();
  const journal = useJournalEntries(session);
  const {
    entries,
    pending,
    saving,
    deletingEntryId,
    loadError,
    saveError,
    deleteError,
    loadEntries,
    saveEntry: persistEntry,
    deleteEntry: removeEntry,
    clearDeleteError,
  } = journal;
  const [emotion, setEmotion] = useState(emotions[1]);
  const [japanese, setJapanese] = useState('');
  const [korean, setKorean] = useState('');
  const [showKoreanField, setShowKoreanField] = useState(false);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteFocusIndex, setDeleteFocusIndex] = useState(0);
  const componentMounted = useRef(true);
  const [signOutError, setSignOutError] = useState('');

  const isGuest = !session;
  useEffect(() => {
    componentMounted.current = true;
    return () => { componentMounted.current = false; };
  }, []);
  const [guestName] = useState(() => (isGuest ? getGuestName() : null));
  const displayName = isGuest
    ? guestName ?? '하루'
    : session.user.user_metadata.full_name ?? session.user.email?.split('@')[0] ?? '나';
  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(today);
  const todayKey = getLocalDayKey(today);
  const todayEntries = entries.filter((entry) => entry.dayKey === todayKey);
  const weeklyDays = selectWeeklyDays(entries, today);
  const weeklyTotal = weeklyDays.reduce((total, day) => total + day.count, 0);
  const emotionStats = selectEmotionStats(entries, weeklyDays, emotions);
  const historyGroups = groupEntriesByDay(entries);

  const saveEntry = async () => {
    if (!japanese.trim()) return;
    const saved = await persistEntry(japanese, korean, emotion.label);
    if (!componentMounted.current || !saved) return;
    setJapanese('');
    setKorean('');
    setShowKoreanField(false);
    navigate('/');
  };

  const handleSignOut = async () => {
    setSignOutError('');
    try {
      const failure = await onSignOut();
      if (!componentMounted.current) return null;
      if (failure) {
        setSignOutError(failure);
        return failure;
      }
      if (componentMounted.current) navigate('/login', { replace: true });
      return null;
    } catch {
      const message = '로그아웃하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.';
      if (componentMounted.current) setSignOutError(message);
      return message;
    }
  };

  const deleteEntry = async () => {
    if (!entryPendingDeletion) return;

    const entryId = entryPendingDeletion;
    clearDeleteError();
    const deleted = await removeEntry(entryId);
    if (!componentMounted.current || !deleted) return;
    setEntryPendingDeletion(null);
    setToastMessage('기록을 삭제했어요.');
  };

  const getDeleteFocusFallback = () => {
    const deleteButtons = document.querySelectorAll<HTMLButtonElement>('[data-history-delete]');
    return deleteButtons[Math.min(deleteFocusIndex, deleteButtons.length - 1)]
      ?? document.querySelector<HTMLElement>('[data-history-title]');
  };

  return (
    <main className="app-shell">
      <JournalHeader
        displayName={displayName}
        isGuest={isGuest}
        signOutError={signOutError}
        onHome={() => navigate('/')}
        onProfile={() => navigate('/profile')}
        onSignOut={handleSignOut}
        onExitGuest={() => {
          onExitGuest();
          navigate('/login', { replace: true });
        }}
      />

      <Routes>
        <Route
          path="/"
          element={(
            <JournalHome
              displayName={displayName}
              today={today}
              entries={todayEntries}
              pending={pending}
              error={loadError}
              onWrite={() => navigate('/write')}
              onRetry={loadEntries}
            />
        )}
        />
        <Route
          path="/write"
          element={(
            <JournalWrite
              dateLabel={dateLabel}
              emotions={emotions}
              selectedEmotion={emotion}
              japanese={japanese}
              korean={korean}
              showKoreanField={showKoreanField}
              saving={saving}
              error={saveError}
              onBack={() => navigate('/')}
              onSelectEmotion={setEmotion}
              onJapaneseChange={setJapanese}
              onKoreanChange={setKorean}
              onToggleKoreanField={() => setShowKoreanField((show) => !show)}
              onSave={saveEntry}
            />
        )}
        />
        <Route
          path="/profile"
          element={(
            <JournalProfile
              displayName={displayName}
              todayKey={todayKey}
              groups={historyGroups}
              days={weeklyDays}
              total={weeklyTotal}
              emotionStats={emotionStats}
              deletingEntryId={deletingEntryId}
              pending={pending}
              error={loadError}
              onRetry={loadEntries}
              onDeleteEntry={(entryId, index) => {
                clearDeleteError();
                setDeleteFocusIndex(index);
                setEntryPendingDeletion(entryId);
              }}
            />
        )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ConfirmDialog
        open={entryPendingDeletion !== null}
        pending={deletingEntryId !== null}
        errorMessage={deleteError}
        onCancel={() => {
          clearDeleteError();
          setEntryPendingDeletion(null);
        }}
        onConfirm={deleteEntry}
        getFallbackFocus={getDeleteFocusFallback}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage('')} />
    </main>
  );
}

export default JournalApp;
