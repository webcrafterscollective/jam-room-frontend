// services/SocketService.js
import { io } from 'socket.io-client';

class SocketService {
  socket = null;
  isConnected = false;
  _listeners = new Map();

  connect(url, onConnect) {
    if (this.isConnected && this.socket?.connected) {
      onConnect?.(this.socket.id);
      return;
    }

    this.socket = io(url, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[SOCKET] Connected:', this.socket.id);
      
      // Restore sticky listeners
      for (const [evt, fns] of this._listeners) {
        for (const fn of fns) this.socket.on(evt, fn);
      }
      onConnect?.(this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[SOCKET] Disconnected:', reason);
    });

    this.socket.on('connect_error', (e) => {
      console.error('[SOCKET] Connection Error:', e.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);
    if (this.socket) this.socket.on(event, cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (this._listeners.has(event)) this._listeners.get(event).delete(cb);
    if (this.socket) this.socket.off(event, cb);
  }

  emit(event, data, callback) {
    if (!this.socket) return;
    this.socket.emit(event, data, (response) => {
      if (callback) callback(response);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Room & Roles
  // ───────────────────────────────────────────────────────────────────────────
  joinRoom({ roomId, role, displayName }, callback) {
    this.emit('joinRoom', { roomId, role, displayName }, callback);
  }

  changeRole(newRole, callback) {
    this.emit('changeRole', { newRole }, callback);
  }

  requestLeadership(callback) {
    this.emit('requestLeadership', {}, callback);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mediasoup
  // ───────────────────────────────────────────────────────────────────────────
  createTransport(direction, callback) {
    this.emit('createTransport', { direction }, callback);
  }

  connectTransport(transportId, dtlsParameters, callback) {
    this.emit('connectTransport', { transportId, dtlsParameters }, callback);
  }

  produce(transportId, kind, rtpParameters, callback) {
    this.emit('produce', { transportId, kind, rtpParameters }, callback);
  }

  produceData(transportId, params, callback) {
    this.emit('produceData', { transportId, ...params }, callback);
  }

  closeProducer(producerId) {
    this.socket?.emit('closeProducer', { producerId });
  }

  consume(transportId, producerId, rtpCapabilities, callback) {
    this.emit('consume', { transportId, producerId, rtpCapabilities }, callback);
  }

  consumeData(transportId, dataProducerId, callback) {
    this.emit('consumeData', { transportId, dataProducerId }, callback);
  }

  resumeConsumer(consumerId, callback) {
    this.emit('resumeConsumer', { consumerId }, callback);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ✅ CORRECTED: Server-Mediated Latency Measurement
  // ───────────────────────────────────────────────────────────────────────────
  
  /**
   * Measure RTT to server (not peer-to-peer)
   */
  pingServer(pingId, t0, callback) {
    this.emit('pingServer', { pingId, t0 }, callback);
  }

  /**
   * Report measured server latency to backend
   * This triggers cascade recalculation of sync offsets
   */
  recordServerLatency(rtt) {
    this.socket?.emit('recordServerLatency', { rtt });
  }

  /**
   * Sync local clock with server
   */
  syncTime(payload, callback) {
    this.emit('syncTime', payload, callback);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Metronome Control
  // ───────────────────────────────────────────────────────────────────────────
  updateMetronome({ isPlaying, tempo, beatsPerMeasure }, callback) {
    this.emit('updateMetronome', { isPlaying, tempo, beatsPerMeasure }, callback);
  }

  announceBeat(beatNumber, timestamp) {
    this.socket?.emit('announceBeat', { beatNumber, timestamp });
  }
}

export const socketService = new SocketService();