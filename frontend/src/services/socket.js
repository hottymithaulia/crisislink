/**
 * Centralized WebSocket / Socket.IO Service
 * Uses socket.io-client to connect to the Node.js backend.
 * Provides a simple on/off/emit interface.
 */

import { io } from 'socket.io-client';
import config from '../config/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.listeners = new Map();
    this.connected = false;
  }

  /**
   * Get or create a persistent device ID
   */
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('crisislink_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('crisislink_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    // Already have a socket instance — don't create another even while connecting
    if (this.socket) {
      return this.socket;
    }

    const serverUrl = config.api.wsUrl || config.api.baseUrl || 'http://localhost:3001';

    console.log('🔌 Connecting to Socket.IO server:', serverUrl);

    this.socket = io(serverUrl, {
      query: { deviceId: this.deviceId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket.IO connected. Socket ID:', this.socket.id);
      this.connected = true;
      this._trigger('connect', { deviceId: this.deviceId });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      this.connected = false;
      this._trigger('disconnect', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket.IO connection error:', err.message);
    });

    // Forward all server events to local listeners
    const serverEvents = [
      'connectionCountUpdate',
      'new_event',
      'event_updated',
      'eventConfirmed',
      'eventFaked',
      'initialEvents',
      'meshInitialState',
      'meshDataUpdate',
      'deviceCount',
    ];

    serverEvents.forEach(eventName => {
      this.socket.on(eventName, (data) => {
        this._trigger(eventName, data);
      });
    });

    return this.socket;
  }

  /**
   * Internal: trigger local listeners for an event
   */
  _trigger(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Ensure connected
    if (!this.socket) {
      this.connect();
    }
  }

  /**
   * Unsubscribe from an event (remove all listeners if no callback given)
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    if (callback) {
      this.listeners.get(event).delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit '${event}': Socket.IO not connected`);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Get current device ID
   */
  getDeviceId() {
    return this.deviceId;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
