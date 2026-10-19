type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Cầu nối nhỏ để bất kỳ màn hình nào cũng mở được form đăng nhập toàn màn hình
 * (layout tab đang quản lý) chỉ bằng một lần chạm — người dùng không phải tự đi
 * tìm chỗ đăng nhập.
 */
export const authPrompt = {
  open(): void {
    listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('authPrompt listener error', e);
      }
    });
  },

  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
