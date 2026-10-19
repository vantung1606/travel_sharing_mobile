import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wayfare_mobile_saved_places';

type Listener = (ids: number[]) => void;
const listeners = new Set<Listener>();
let cache: number[] | null = null;

function emit(ids: number[]) {
  cache = ids;
  listeners.forEach((cb) => {
    try {
      cb(ids);
    } catch (e) {
      console.warn('savedPlaces listener error', e);
    }
  });
}

/**
 * Danh sách địa điểm người dùng đánh dấu "muốn đi", lưu bền ngay trên thiết bị
 * (chưa cần backend). Nhờ vậy nút trái tim ở tab Địa điểm là thật: bấm lưu rồi
 * mở lại app vẫn còn.
 */
export const savedPlaces = {
  async getAll(): Promise<number[]> {
    if (cache) return cache;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const ids: number[] = Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
      cache = ids;
      return ids;
    } catch (e) {
      console.warn('Could not read saved places', e);
      return [];
    }
  },

  /** Bật/tắt lưu, trả về trạng thái mới (true = đã lưu). */
  async toggle(id: number): Promise<boolean> {
    const current = await savedPlaces.getAll();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    emit(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Could not persist saved places', e);
    }
    return next.includes(id);
  },

  /**
   * Hợp nhất danh sách từ SERVER (bảng saved_places) với danh sách local
   * theo phép UNION — địa điểm đã lưu từ web/thiết bị khác cũng xuất hiện,
   * những gì đã lưu offline trên máy này không bị mất.
   */
  async merge(ids: number[]): Promise<number[]> {
    const current = await savedPlaces.getAll();
    const next = [...current, ...ids.filter((n) => typeof n === 'number' && !current.includes(n))];
    if (next.length === current.length) return next;
    emit(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Could not persist merged saved places', e);
    }
    return next;
  },

  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
