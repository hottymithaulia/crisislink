/**
 * Centralized WebSocket Service
 * Single socket instance for the entire application
 * Uses persistent deviceId to track physical devices
 */

import { io } from 'socket.io-client';
import config from '../config/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.listeners = new Map();
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
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected');
      return this.socket;
    }

    this.socket = io(config.api.wsUrl, {
      query: { deviceId: this.deviceId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id, 'Device:', this.deviceId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });

    return this.socket;
  }

  /**
   * Get the socket instance (connects if not already connected)
   */
  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    const socket = this.getSocket();
    socket.on(event, callback);
    
    // Track listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    const socket = this.getSocket();
    socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    const socket = this.getSocket();
    socket.emit(event, data);
  }

  /**
   * Get current device ID
   */
  getDeviceId() {
    return this.deviceId;
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
