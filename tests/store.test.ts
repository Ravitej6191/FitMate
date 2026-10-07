import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage for the node test environment
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});

import { useStore, flushPersist } from '@/lib/store';
import { STORAGE_KEY } from '@/lib/constants';

beforeEach(() => { mem.clear(); useStore.getState().resetStore(); });

describe('persistence', () => {
  it('flushPersist writes pending changes immediately', () => {
    useStore.getState().updateProfile({ name: 'Flushy' });
    flushPersist();
    expect(JSON.parse(mem.get(STORAGE_KEY)!).profile.name).toBe('Flushy');
  });
});

describe('export / import', () => {
  it('round-trips and applies migrations', () => {
    useStore.getState().updateProfile({ name: 'Backup Me' });
    const raw = useStore.getState().exportData();
    useStore.getState().resetStore();
    expect(useStore.getState().profile.name).not.toBe('Backup Me');
    expect(useStore.getState().importData(raw)).toBe(true);
    expect(useStore.getState().profile.name).toBe('Backup Me');
  });
  it('rejects invalid input without touching data', () => {
    useStore.getState().updateProfile({ name: 'Keep' });
    expect(useStore.getState().importData('not json')).toBe(false);
    expect(useStore.getState().importData('{"logs":[]}')).toBe(false);
    expect(useStore.getState().profile.name).toBe('Keep');
  });
  it('import is not clobbered by an earlier pending write', () => {
    const raw = useStore.getState().exportData();
    useStore.getState().updateProfile({ name: 'Stale' }); // schedules a debounced write
    useStore.getState().importData(raw);
    flushPersist();
    expect(JSON.parse(mem.get(STORAGE_KEY)!).profile.name).not.toBe('Stale');
  });
});
