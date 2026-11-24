/* eslint-env node */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLocalDayKey,
  groupEntriesByDay,
  selectEmotionStats,
  selectWeeklyDays,
} from './journalSelectors.ts';

const entry = (id, date, emotion = '기쁨') => ({
  id,
  dayKey: getLocalDayKey(date),
  dayLabel: date.toISOString(),
  time: '',
  emotion: { icon: '', label: emotion },
  japanese: '',
  korean: '',
});

test('weekly range starts Monday and crosses month end', () => {
  const today = new Date(2025, 3, 30);
  const days = selectWeeklyDays([], today);
  assert.equal(days[0].key, getLocalDayKey(new Date(2025, 3, 28)));
  assert.equal(days[6].key, getLocalDayKey(new Date(2025, 4, 4)));
});

test('weekly range crosses year end and counts each local date', () => {
  const monday = new Date(2024, 11, 30);
  const entries = [entry('1', monday), entry('2', new Date(2025, 0, 1), '평온')];
  const days = selectWeeklyDays(entries, new Date(2024, 11, 31));
  assert.equal(days[0].key, getLocalDayKey(monday));
  assert.equal(days[2].key, getLocalDayKey(new Date(2025, 0, 1)));
  assert.deepEqual(days.map((day) => day.count), [1, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(selectEmotionStats(entries, days, [
    { icon: 'a', label: '기쁨' },
    { icon: 'b', label: '평온' },
  ]).map(({ label, count }) => [label, count]), [['기쁨', 1], ['평온', 1]]);
});

test('grouping keeps first-seen day order and groups in input order', () => {
  const entries = [
    entry('first', new Date(2025, 0, 2)),
    entry('second', new Date(2025, 0, 1)),
    entry('third', new Date(2025, 0, 2)),
  ];
  const groups = groupEntriesByDay(entries);
  assert.deepEqual(groups.map((group) => group.entries.map((item) => item.id)), [
    ['first', 'third'],
    ['second'],
  ]);
});
