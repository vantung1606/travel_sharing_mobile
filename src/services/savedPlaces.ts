import { PlaceItem, savedPlaceApi } from './api';
import { authStorage } from './authStorage';

type Listener = (ids: number[]) => void;
const listeners = new Set<Listener>();
let accountToken: string | null = null;
let accountVersion = 0;
let revision = 0;
let loadVersion = 0;
let ids: number[] = [];
let hydrated = false;
const pending = new Map<string, Promise<boolean>>();

function publish(next: number[]) {
  ids = [...new Set(next)];
  listeners.forEach(listener => {
    try { listener([...ids]); }
    catch (error) { console.warn('Saved places listener failed', error); }
  });
}

function setAccount(token: string | null) {
  if (token === accountToken) return;
  accountToken = token;
  accountVersion += 1;
  revision += 1;
  loadVersion += 1;
  hydrated = false;
  publish([]);
}

// Session changes immediately discard the previous account's cached IDs.
authStorage.subscribe(session => setAccount(session?.token || null));

async function getItems(): Promise<PlaceItem[]> {
  const session = await authStorage.getSession();
  setAccount(session?.token || null);
  if (!accountToken) return [];
  const version = accountVersion;
  const request = ++loadVersion;
  const before = revision;
  const items = await savedPlaceApi.getSavedPlaceItems();
  if (version !== accountVersion) return [];
  if (request === loadVersion && before === revision) {
    hydrated = true;
    publish(items.map(item => item.id));
  }
  return before === revision ? items : items.filter(item => ids.includes(item.id));
}

async function mutate(id: number, desired?: boolean): Promise<boolean> {
  const session = await authStorage.getSession();
  setAccount(session?.token || null);
  if (!accountToken) throw new Error('Vui lòng đăng nhập để lưu địa điểm.');
  const version = accountVersion;
  const key = version + ':' + id;
  const existing = pending.get(key);
  if (existing) return existing;
  const operation = (async () => {
    if (!hydrated) await getItems();
    if (version !== accountVersion) throw new Error('Tài khoản đã thay đổi. Vui lòng thử lại.');
    const nextSaved = desired ?? !ids.includes(id);
    revision += 1;
    if (nextSaved) await savedPlaceApi.addSavedPlace(id);
    else await savedPlaceApi.removeSavedPlace(id);
    if (version === accountVersion) {
      revision += 1;
      publish(nextSaved ? [...ids, id] : ids.filter(value => value !== id));
    }
    return nextSaved;
  })();
  pending.set(key, operation);
  try { return await operation; }
  finally { pending.delete(key); }
}

/** Shared cache reflects successful server responses only; MySQL owns saved data. */
export const savedPlaces = {
  getItems,
  async getAll(): Promise<number[]> {
    await getItems();
    return [...ids];
  },
  toggle(id: number): Promise<boolean> { return mutate(id); },
  async remove(id: number): Promise<void> { await mutate(id, false); },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener([...ids]);
    return () => { listeners.delete(listener); };
  },
};
