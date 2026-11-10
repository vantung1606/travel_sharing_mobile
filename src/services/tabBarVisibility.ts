import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type Listener = (visible: boolean) => void;

/**
 * Quản lý trạng thái hiển thị của thanh Tab bar dưới cùng:
 * - Tự động ẩn nhẹ nhàng khi người dùng đứng yên (không thao tác sau ~3s) hoặc cuộn xuống xem bài.
 * - Trồi lên nghệ thuật với animation lò xo khi người dùng vuốt lên hoặc tương tác lại.
 */
class TabBarVisibilityManager {
  private visible = true;
  private listeners = new Set<Listener>();
  private lastOffsetY = 0;
  private idleTimer: any = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.visible);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show() {
    if (!this.visible) {
      this.visible = true;
      this.notify();
    }
    this.scheduleIdleTimer();
  }

  hide() {
    if (this.visible) {
      this.visible = false;
      this.notify();
    }
    this.clearIdleTimer();
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.visible);
      } catch {
        // ignore
      }
    });
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private scheduleIdleTimer() {
    this.clearIdleTimer();
    // Đứng yên 3.2 giây (và không ở đỉnh trang) -> Tự động ẩn thanh tab bar
    this.idleTimer = setTimeout(() => {
      if (this.lastOffsetY > 60) {
        this.hide();
      }
    }, 3200);
  }

  /**
   * Bắt sự kiện cuộn từ FlatList/ScrollView:
   * - Vuốt lên (cuộn về đầu trang, diff < -6): Trồi thanh tab lên ngay lập tức.
   * - Cuộn xuống (diff > 12): Ẩn thanh tab để màn hình rộng thoáng.
   * - Ở đỉnh trang (offsetY <= 40): Luôn hiển thị thanh tab.
   * - Dừng cuộn: Kích hoạt đếm lùi để ẩn khi đứng yên.
   */
  onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent?.contentOffset?.y ?? 0;
    const diff = currentY - this.lastOffsetY;

    // 1. Ở sát đỉnh trang -> luôn hiển thị
    if (currentY <= 40) {
      this.lastOffsetY = currentY;
      this.show();
      return;
    }

    // 2. Vuốt lên (diff < -6: người dùng cuộn ngược lên) -> trồi thanh tab lên nghệ thuật
    if (diff < -6) {
      this.show();
    }
    // 3. Cuộn xuống xem thêm bài viết -> ẩn thanh tab
    else if (diff > 12) {
      this.hide();
    }
    // 4. Gia hạn bộ đếm khi tốc độ cuộn chậm
    else {
      this.scheduleIdleTimer();
    }

    this.lastOffsetY = currentY;
  };
}

export const tabBarVisibility = new TabBarVisibilityManager();
