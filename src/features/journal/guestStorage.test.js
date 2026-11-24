/* eslint-env node */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteGuestEntry,
  isStoredEntry,
  readGuestEntries,
  saveGuestEntry,
} from './guestStorage.ts';

const emotions = ['기쁨', '평온', '보통', '피곤', '슬픔', '눈물'];
const validEntry = (value) => isStoredEntry(value, emotions);

function createStorage(raw = null, shouldFailWrite = false) {
  return {
    raw,
    getItem() { return this.raw; },
    setItem(_key, value) {
      if (shouldFailWrite) throw new Error('QuotaExceededError');
      this.raw = value;
    },
  };
}

const entry = {
  id: 'new',
  emotion_label: '기쁨',
  japanese: '今日はいい日でした。',
  korean: null,
  created_at: '2026-11-24T00:00:00.000Z',
};

test('invalid JSON stays untouched and blocks saving', () => {
  const storage = createStorage('{"partial":');
  assert.equal(readGuestEntries(storage, 'entries', emotions).error, 'read');
  assert.equal(saveGuestEntry(storage, 'entries', entry, emotions).error, 'read');
  assert.equal(storage.raw, '{"partial":');
});

test('valid JSON with invalid record shape stays untouched', () => {
  const storage = createStorage('{"not":"an array"}');
  assert.equal(readGuestEntries(storage, 'entries', emotions).error, 'corrupt');
  assert.equal(saveGuestEntry(storage, 'entries', entry, emotions).error, 'corrupt');
  assert.equal(storage.raw, '{"not":"an array"}');
});

test('record validation rejects missing fields and invalid dates', () => {
  assert.equal(validEntry({ ...entry, created_at: 'yesterday-ish' }), false);
  assert.equal(validEntry({ ...entry, japanese: undefined }), false);
});

test('quota errors return failure without claiming a successful write', () => {
  const original = JSON.stringify([entry]);
  const storage = createStorage(original, true);
  const result = saveGuestEntry(storage, 'entries', { ...entry, id: 'next' }, emotions);
  assert.equal(result.error, 'write');
  assert.deepEqual(result.entries.map((item) => item.id), ['new']);
  assert.equal(storage.raw, original);
  assert.equal(deleteGuestEntry(storage, 'entries', 'new', emotions).error, 'write');
  assert.equal(storage.raw, original);
});
