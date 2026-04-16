// Storage is now handled inline in store.ts via persist().
// This file is kept for the clearState utility.
import { STORAGE_KEY } from './constants';

export function clearState(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
