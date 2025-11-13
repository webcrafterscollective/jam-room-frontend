// services/SocketService.js
// ───────────────────────────────────────────────────────────────────────────────
// Thin client-side wrapper around socket.io-client.
//
// Purpose:
//   • Maintain a persistent socket connection to the signaling server.
//   • Provide RPC-style convenience methods (emit + ack).
//   • Provide event subscription helpers that work BEFORE/AFTER connection.
//   • Ensure event listeners persist across reconnects.
//
// Used by:
//   • Mediasoup WebRTC client (joinRoom, createTransport, produce, consume, etc.)
//   • UI to receive real-time events (participantJoined, mediaProducerCreated…)
// ───────────────────────────────────────────────────────────────────────────────

import { io } from 'socket.io-client';

class SocketService {
  socket = null;          // Underlying socket.io-client instance
  isConnected = false;    // Boolean: true after "connect" fires
  _listeners = new Map(); // Map<eventName, Set<listener functions>>

  // ───────────────────────────────────────────────────────────────────────────
  // connect(url, onConnect)
  //
  // Establishes a socket connection. If already connected, immediately
  // invokes the callback with the current socket.id.
  //
  // Behavior:
  //   • Uses only WebSocket transport (no polling fallback).
  //   • Re-registers all stored listeners on reconnect.
  //   • Listens for connect/disconnect/connect_error events.
  // ───────────────────────────────────────────────────────────────────────────
  connect(url, onConnect) {
    // Fast path: already connected → just give socket.id back
    if (this.isConnected && this.socket?.connected) {
      onConnect?.(this.socket.id);
      return;
    }

    // Create a new socket.io client instance
    this.socket = io(url, { transports: ['websocket'] });

    // Fired once when connection is established
    this.socket.once('connect', () => {
      this.isConnected = true;
      console.log('[SOCKET] connected', this.socket.id);

      // Re-bind all previously registered event listeners (sticky listeners)
      for (const [evt, fns] of this._listeners) {
        for (const fn of fns) this.socket.on(evt, fn);
      }

      // Inform caller of successful connection
      onConnect?.(this.socket.id);
    });

    // Fired when connection is lost (network drop, server crash, etc.)
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[SOCKET] disconnect', reason);
    });

    // Fired when initial connect fails
    this.socket.on('connect_error', (e) => {
      console.error('[SOCKET] connect_error', e?.message);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // disconnect()
  //
  // Manually closes the socket connection.
  // Useful when leaving the site/app or resetting state.
  // ───────────────────────────────────────────────────────────────────────────
  disconnect() {
    if (!this.socket || !this.isConnected) return;
    console.log('[SOCKET] disconnect() called');
    this.socket.disconnect();
    this.isConnected = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event Listener Management (on/off)
  //
  // on(event, callback):
  //   • Registers listeners BEFORE connection.
  //   • Stores them so reconnect re-attaches them.
  //
  // off(event, callback):
  //   • Removes listener from both local store + socket.
  //
  // Returns an `unsubscribe` function for convenience.
  // ───────────────────────────────────────────────────────────────────────────
  on(event, cb) {
    // Track listeners in our internal map
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);

    // If connected, attach immediately
    if (this.socket) this.socket.on(event, cb);

    // Return unsubscribe function
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (this._listeners.has(event)) this._listeners.get(event).delete(cb);
    if (this.socket) this.socket.off(event, cb);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RPC (Remote Procedure Call) convenience wrappers
  //
  // Pattern:
  //   socket.emit(eventName, payload, ackCallback)
  //
  // The server receives the event and replies with an ACK response shaped like:
  //   callback({ ...result })
  //
  // These wrappers ensure consistent logging and safe callback invocation.
  // ───────────────────────────────────────────────────────────────────────────

  joinRoom(roomId, callback) {
    console.log('[RPC] joinRoom', roomId);
    this.socket?.emit('joinRoom', { roomId }, (res) => {
      console.log('[ACK] joinRoom', res);
      callback?.(res);
    });
  }

  getRouterRtpCapabilities(callback) {
    console.log('[RPC] getRouterRtpCapabilities');
    this.socket?.emit('getRouterRtpCapabilities', (res) => {
      console.log('[ACK] getRouterRtpCapabilities', res);
      callback?.(res);
    });
  }

  createTransport(direction, callback) {
    console.log('[RPC] createTransport', direction);
    this.socket?.emit('createTransport', { direction }, (res) => {
      console.log('[ACK] createTransport', res);
      callback?.(res);
    });
  }

  connectTransport(transportId, dtlsParameters, callback) {
    console.log('[RPC] connectTransport', transportId);
    this.socket?.emit('connectTransport', { transportId, dtlsParameters }, (res) => {
      console.log('[ACK] connectTransport', res);
      callback?.(res);
    });
  }

  produce(transportId, kind, rtpParameters, callback) {
    console.log('[RPC] produce', { transportId, kind });
    this.socket?.emit('produce', { transportId, kind, rtpParameters }, (res) => {
      console.log('[ACK] produce', res);
      callback?.(res);
    });
  }

  consume(transportId, producerId, rtpCapabilities, callback) {
    console.log('[RPC] consume', { transportId, producerId });
    this.socket?.emit(
      'consume',
      { transportId, producerId, rtpCapabilities },
      (res) => {
        console.log('[ACK] consume', res);
        callback?.(res);
      }
    );
  }

  resumeConsumer(consumerId, callback) {
    console.log('[RPC] resumeConsumer', consumerId);
    this.socket?.emit('resumeConsumer', { consumerId }, (res) => {
      console.log('[ACK] resumeConsumer', res);
      callback?.(res);
    });
  }

  closeProducer(producerId, callback) {
    console.log('[RPC] closeProducer', producerId);
    this.socket?.emit('closeProducer', { producerId }, (res) => {
      console.log('[ACK] closeProducer', res);
      callback?.(res);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DataChannel RPCs (SCTP)
  // produceData → create DataProducer
  // consumeData → create DataConsumer
  //
  // Includes defensive wrapping to guarantee structured ACKs.
  // ───────────────────────────────────────────────────────────────────────────

  produceData(transportId, { label, protocol, sctpStreamParameters }, callback) {
    console.log('[RPC] produceData', { transportId, label, protocol, sctpStreamParameters });
    this.socket?.emit(
      'produceData',
      { transportId, label, protocol, sctpStreamParameters },
      (res) => {
        console.log('[ACK] produceData', res);
        const obj = (res && typeof res === 'object')
          ? res
          : { error: 'bad-ack', raw: res };
        callback?.(obj);
      }
    );
  }

  consumeData(transportId, dataProducerId, callback) {
    console.log('[RPC] consumeData', { transportId, dataProducerId });
    this.socket?.emit('consumeData', { transportId, dataProducerId }, (res) => {
      console.log('[ACK] consumeData', res);
      const obj = (res && typeof res === 'object')
        ? res
        : { error: 'bad-ack', raw: res };
      callback?.(obj);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Convenience event subscription wrappers
  //
  // These correspond to server-emitted events sent via socket.to(roomId).emit()
  //
  //   participantJoined
  //   participantLeft
  //   mediaProducerCreated
  //   mediaProducerClosed
  //   dataProducerCreated
  // ───────────────────────────────────────────────────────────────────────────
  onParticipantJoined(cb) { return this.on('participantJoined', cb); }
  onParticipantLeft(cb) { return this.on('participantLeft', cb); }
  onMediaProducerCreated(cb) { return this.on('mediaProducerCreated', cb); }
  onMediaProducerClosed(cb) { return this.on('mediaProducerClosed', cb); }
  onDataProducerCreated(cb) { return this.on('dataProducerCreated', cb); }
}

// Singleton instance
export const socketService = new SocketService();
