import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { API_BASE_URL } from './api';

type RoomMessageHandler = (message: any) => void;

/**
 * Web dùng STOMP qua `${VITE_WS_URL || API_URL -> ws}/ws/chat`.
 * Mobile dùng đúng endpoint đó nhưng qua WebSocket gốc (không qua SockJS),
 * vì backend đã expose thêm endpoint /ws/chat không SockJS (WebSocketConfig).
 */
const buildWsUrl = (): string => {
  const explicit = process.env.EXPO_PUBLIC_WS_URL;
  if (explicit) return explicit;
  return `${API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '')}/ws/chat`;
};

class ChatSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private roomHandlers = new Map<string, Set<RoomMessageHandler>>();
  private roomSubscriptions = new Map<string, StompSubscription>();

  connect(onConnected?: () => void): void {
    if (this.client && this.client.active) {
      if (this.isConnected && onConnected) onConnected();
      return;
    }

    const wsUrl = buildWsUrl();
    console.log('[STOMP] Connecting to', wsUrl);

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      connectionTimeout: 10000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,
      webSocketFactory: () => new WebSocket(wsUrl),
      debug: (msg) => {
        if (__DEV__) console.log('[STOMP DEBUG]', msg);
      },
      onConnect: () => {
        this.isConnected = true;
        this.roomSubscriptions.clear();
        // Re-subscribe các phòng đang mở sau khi (re)connect
        this.roomHandlers.forEach((_handlers, roomId) => this.ensureRoomSubscription(roomId));
        if (onConnected) onConnected();
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        this.roomSubscriptions.clear();
      },
      onWebSocketError: (event) => {
        console.warn('[STOMP] WebSocket error:', event);
      },
      onStompError: (frame) => {
        console.warn('[STOMP] Broker error:', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  private isSocketReady(): boolean {
    return Boolean(this.client && (this.client.connected || this.isConnected));
  }

  private ensureRoomSubscription(roomId: string): void {
    if (!this.isSocketReady() || !this.client) return;
    if (this.roomSubscriptions.has(roomId)) return;

    const handlers = this.roomHandlers.get(roomId);
    if (!handlers || handlers.size === 0) return;

    try {
      const sub = this.client.subscribe(`/topic/room.${roomId}`, (frame: IMessage) => {
        let payload: any;
        try {
          payload = JSON.parse(frame.body);
        } catch {
          return;
        }
        const activeHandlers = this.roomHandlers.get(roomId);
        if (!activeHandlers) return;
        activeHandlers.forEach((handler) => {
          try {
            handler(payload);
          } catch (e) {
            console.warn('[STOMP] room handler error:', e);
          }
        });
      });
      this.roomSubscriptions.set(roomId, sub);
      if (__DEV__) console.log(`[STOMP] Subscribed successfully to /topic/room.${roomId}`);
    } catch (e) {
      console.warn(`[STOMP] subscribe room ${roomId} failed:`, e);
    }
  }

  /**
   * Đăng ký nhận tin nhắn realtime của 1 phòng.
   * Trả về hàm unsubscribe; khi handler cuối cùng rời phòng sẽ tự huỷ subscription.
   */
  subscribeToRoom(roomId: number | string, handler: RoomMessageHandler): () => void {
    const key = String(roomId);
    this.connect();

    if (!this.roomHandlers.has(key)) {
      this.roomHandlers.set(key, new Set());
    }
    this.roomHandlers.get(key)!.add(handler);
    this.ensureRoomSubscription(key);

    // Polling retry để đảm bảo chắc chắn subscribe thành công ngay khi socket bắt tay xong (200-500ms)
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount += 1;
      if (this.roomSubscriptions.has(key) || retryCount > 40) {
        clearInterval(retryInterval);
        return;
      }
      if (this.isSocketReady()) {
        this.ensureRoomSubscription(key);
        if (this.roomSubscriptions.has(key)) {
          clearInterval(retryInterval);
        }
      }
    }, 150);

    return () => {
      clearInterval(retryInterval);
      const handlers = this.roomHandlers.get(key);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.roomHandlers.delete(key);
        const sub = this.roomSubscriptions.get(key);
        if (sub) {
          try {
            sub.unsubscribe();
          } catch {
            // ignore
          }
          this.roomSubscriptions.delete(key);
        }
      }
    };
  }

  /**
   * Đăng ký nhận sự kiện typing (đang soạn tin) của phòng.
   */
  subscribeToTyping(roomId: number | string, handler: (payload: any) => void): () => void {
    const key = String(roomId);
    this.connect();

    let sub: StompSubscription | null = null;
    const topic = `/topic/room.${key}/typing`;

    const doSub = () => {
      if (!this.isSocketReady() || !this.client) return;
      try {
        sub = this.client.subscribe(topic, (frame: IMessage) => {
          try {
            const data = JSON.parse(frame.body);
            handler(data);
          } catch {
            // ignore
          }
        });
      } catch (e) {
        console.warn(`[STOMP] subscribe typing room ${key} failed:`, e);
      }
    };

    if (this.isSocketReady()) {
      doSub();
    } else {
      const interval = setInterval(() => {
        if (this.isSocketReady()) {
          clearInterval(interval);
          doSub();
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    }

    return () => {
      if (sub) {
        try {
          sub.unsubscribe();
        } catch {
          // ignore
        }
      }
    };
  }

  /**
   * Đăng ký nhận sự kiện đã đọc (read receipt) của phòng.
   */
  subscribeToReadReceipt(roomId: number | string, handler: (payload: any) => void): () => void {
    const key = String(roomId);
    this.connect();

    let sub: StompSubscription | null = null;
    const topic = `/topic/room.${key}/read`;

    const doSub = () => {
      if (!this.isSocketReady() || !this.client) return;
      try {
        sub = this.client.subscribe(topic, (frame: IMessage) => {
          try {
            const data = JSON.parse(frame.body);
            handler(data);
          } catch {
            // ignore
          }
        });
      } catch (e) {
        console.warn(`[STOMP] subscribe read room ${key} failed:`, e);
      }
    };

    if (this.isSocketReady()) {
      doSub();
    } else {
      const interval = setInterval(() => {
        if (this.isSocketReady()) {
          clearInterval(interval);
          doSub();
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    }

    return () => {
      if (sub) {
        try {
          sub.unsubscribe();
        } catch {
          // ignore
        }
      }
    };
  }

  sendTyping(roomId: number | string, data: { email: string; userName?: string; isTyping: boolean }): void {
    if (!this.isSocketReady() || !this.client || !roomId) return;
    try {
      this.client.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ roomId: Number(roomId), ...data }),
      });
    } catch (e) {
      console.warn('[STOMP] sendTyping error:', e);
    }
  }

  subscribeToUserChat(userId: number | string | undefined, userEmail: string | undefined, onUpdate: (room: any) => void): () => void {
    if (!onUpdate) return () => {};
    this.connect();

    const subs: StompSubscription[] = [];
    const doSub = () => {
      if (!this.isSocketReady() || !this.client) return;
      if (userId) {
        try {
          const s1 = this.client.subscribe(`/topic/user.${userId}.chat`, (msg) => {
            try {
              onUpdate(JSON.parse(msg.body));
            } catch {}
          });
          subs.push(s1);
        } catch {}
      }
      if (userEmail) {
        try {
          const s2 = this.client.subscribe(`/topic/user.${userEmail.toLowerCase().trim()}.chat`, (msg) => {
            try {
              onUpdate(JSON.parse(msg.body));
            } catch {}
          });
          subs.push(s2);
        } catch {}
      }
    };

    if (this.isSocketReady()) {
      doSub();
    } else {
      const interval = setInterval(() => {
        if (this.isSocketReady()) {
          clearInterval(interval);
          doSub();
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    }

    return () => {
      subs.forEach(s => {
        try { s.unsubscribe(); } catch {}
      });
    };
  }

  sendReadReceipt(roomId: number | string, data: { email: string; lastReadMessageId?: number }): void {
    if (!this.isSocketReady() || !this.client || !roomId) return;
    try {
      this.client.publish({
        destination: '/app/chat.read',
        body: JSON.stringify({ roomId: Number(roomId), ...data }),
      });
    } catch (e) {
      console.warn('[STOMP] sendReadReceipt error:', e);
    }
  }

  disconnect(): void {
    this.roomSubscriptions.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch {
        // ignore
      }
    });
    this.roomSubscriptions.clear();
    this.roomHandlers.clear();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isSocketReady();
  }
}

export const chatSocket = new ChatSocketService();
