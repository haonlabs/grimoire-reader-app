import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';

export function readLocalJson<T>(key: string, fallback: T): T {
  if (!browser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T) {
  if (!browser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function localStore<T>(key: string, fallback: T): Writable<T> {
  const store = writable<T>(readLocalJson(key, fallback));
  if (browser) {
    store.subscribe((value) => writeLocalJson(key, value));
  }
  return store;
}
