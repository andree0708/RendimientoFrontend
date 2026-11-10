import { Injectable, signal, inject, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { WSEvent } from '../models';

type EventHandler = (event: WSEvent) => void;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private auth = inject(AuthService);
  private zone = inject(NgZone);

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnect = 5;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  /** Signal: true when the WebSocket is connected. */
  readonly connected = signal(false);

  /** Signal: latest received event (for components that want a stream). */
  readonly lastEvent = signal<WSEvent | null>(null);

  private handlers = new Map<string, Set<EventHandler>>();

  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  /** Connect to the WebSocket endpoint with the current JWT. */
  connect(): void {
    if (!this.auth.accessToken) return;
    this.shouldConnect = true;
    this.openSocket();
  }

  private openSocket(): void {
    const token = this.auth.accessToken;
    if (!token) return;

    // Run outside Angular zone to avoid unnecessary change detection
    this.zone.runOutsideAngular(() => {
      const url = `${environment.wsUrl}?token=${token}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.zone.run(() => this.connected.set(true));
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (data.type === 'pong') return;
          if (data.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          // data is a WSEnvelope { type: 'event', data: WSEvent }
          if (data.type === 'event' && data.data) {
            const event = data.data as WSEvent;
            this.zone.run(() => {
              this.lastEvent.set(event);
              this.dispatchEvent(event);
            });
          }
        } catch {
          // ignore invalid JSON
        }
      };

      this.ws.onclose = () => {
        this.zone.run(() => this.connected.set(false));
        this.stopHeartbeat();
        this.ws = null;
        if (this.shouldConnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will handle reconnection
      };
    });
  }

  private dispatchEvent(event: WSEvent): void {
    // Dispatch to type-specific handlers
    const typeHandlers = this.handlers.get(event.event_type);
    if (typeHandlers) {
      typeHandlers.forEach((h) => h(event));
    }
    // Dispatch to wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => h(event));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnect) {
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  /** Send a message to the server. */
  send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Disconnect and stop reconnection attempts. */
  disconnect(): void {
    this.shouldConnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected.set(false);
  }
}
