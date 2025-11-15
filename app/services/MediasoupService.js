// services/MediasoupService.js
// ───────────────────────────────────────────────────────────────────────────────
// Client-side Mediasoup controller.
// This encapsulates:
//
//   • mediasoup-client.Device
//   • Send & Recv WebRTC Transports (DTLS/SRTP/SCTP)
//   • Producers (audio/video tracks sent to SFU)
//   • Consumers (tracks received from SFU)
//   • DataProducers / DataConsumers (RTCDataChannel <-> SCTP)
//
// Handles all WebRTC events and translates them into
// RPC calls to the signaling server via SocketService.
//
// ───────────────────────────────────────────────────────────────────────────────

import * as mediasoupClient from 'mediasoup-client';
import { socketService } from './SocketService';

const LOG = (...a) => console.log('[MS]', ...a);
const WARN = (...a) => console.warn('[MS]', ...a);
const ERR = (...a) => console.error('[MS]', ...a);

class MediasoupService {
  device = null;          // mediasoup-client Device (local RTP/codec capabilities)
  sendTransport = null;   // Outgoing WebRTC transport (DTLS to send audio/data)
  recvTransport = null;   // Incoming WebRTC transport (DTLS to receive audio/data)
  producers = new Map();  // media Producers (local mic tracks)
  consumers = new Map();  // media Consumers received from other peers
  dataProducers = new Map(); // DataChannel senders
  dataConsumers = new Map(); // DataChannel receivers

  constructor() {
    this.device = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // loadDevice()
  //
  // Must be called once before creating transports.
  // Loads router RTP capabilities from SFU and initializes codecs.
  //
  // If device already loaded, silently no-op.
  // ───────────────────────────────────────────────────────────────────────────
  async loadDevice(routerRtpCapabilities) {
    if (this.device?.loaded) return;
    try {
      this.device = new mediasoupClient.Device();
      await this.device.load({ routerRtpCapabilities });
      LOG('device loaded');
    } catch (err) {
      ERR('device load error', err);
      throw err;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // createSendTransport()
  //
  // Creates a transport for sending:
  //   • audio tracks (Producers)
  //   • SCTP DataChannels (DataProducers)
  //
  // Wiring:
  //   mediasoup-client triggers “connect” → we call socketService.connectTransport
  //   mediasoup-client triggers “produce” → we call socketService.produce
  //   mediasoup-client triggers “producedata” → we call socketService.produceData
  //
  // Returns: a Promise resolved with the created sendTransport.
  // ───────────────────────────────────────────────────────────────────────────
  async createSendTransport() {
    if (this.sendTransport) return this.sendTransport;

    return new Promise((resolve, reject) => {
      // Request transport parameters from server
      socketService.createTransport('send', (tp) => {
        if (!tp || tp.error) {
          const e = tp?.error || 'no transport params';
          ERR('createSendTransport ack error', e);
          return reject(new Error(e));
        }

        // Create the mediasoup-client WebRTC SendTransport
        this.sendTransport = this.device.createSendTransport(tp);
        LOG('sendTransport created', this.sendTransport.id);

        // ───────────────────────────────────────────────
        // CONNECT EVENT (DTLS handshake)
        // Called by mediasoup-client when it needs us to signal DTLS params
        // to the server so it can finalize SRTP key negotiation.
        // ───────────────────────────────────────────────
        this.sendTransport.on(
          'connect',
          ({ dtlsParameters }, callback, errback) => {
            LOG('sendTransport.on(connect) → RPC connectTransport');
            socketService.connectTransport(
              this.sendTransport.id,
              dtlsParameters,
              ({ connected, error }) => {
                if (error) {
                  ERR('connectTransport error', error);
                  return errback(new Error(error));
                }
                if (connected) {
                  LOG('sendTransport connected');
                  callback();
                } else {
                  ERR('connectTransport not connected');
                  errback(new Error('Failed to connect send transport'));
                }
              }
            );
          }
        );

        // ───────────────────────────────────────────────
        // PRODUCE EVENT (media)
        // Called when we call sendTransport.produce({ track })
        // mediasoup-client expects us to return a Producer.id via callback().
        // ───────────────────────────────────────────────
        this.sendTransport.on(
          'produce',
          ({ kind, rtpParameters }, callback, errback) => {
            LOG('sendTransport.on(produce) → RPC produce', { kind });
            socketService.produce(
              this.sendTransport.id,
              kind,
              rtpParameters,
              ({ id, error } = {}) => {
                if (error) {
                  ERR('produce ack error', error);
                  return errback(new Error(error));
                }
                if (!id) {
                  ERR('produce ack missing id');
                  return errback(new Error('produce ack missing id'));
                }
                LOG('produce ack ok', id);
                callback({ id });
              }
            );
          }
        );

        // ───────────────────────────────────────────────
        // PRODUCEDATA EVENT (DataChannel)
        // Fired when we call sendTransport.produceData()
        // We must send SCTP stream parameters to the server.
        // ───────────────────────────────────────────────
        this.sendTransport.on(
          'producedata',
          ({ sctpStreamParameters, label, protocol }, callback, errback) => {
            console.log('[MS] producedata fired', {
              label, protocol, sctpStreamParameters
            });

            socketService.produceData(
              this.sendTransport.id,
              { label, protocol, sctpStreamParameters },
              (ack = {}) => {
                const { id, error } = ack;
                if (error) {
                  console.error('[MS] produceData ack error', error, ack);
                  return errback(new Error(error));
                }
                if (!id) {
                  console.error('[MS] produceData ack missing id', ack);
                  return errback(new Error('produceData ack missing id'));
                }

                console.log('[MS] produceData ack ok', id);
                callback({ id });
              }
            );
          }
        );

        resolve(this.sendTransport);
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // createRecvTransport()
  //
  // Transport for receiving:
  //   • remote audio tracks (Consumers)
  //   • remote DataChannels (DataConsumers)
  //
  // Behaves similarly to createSendTransport but without "produce" handlers.
  // ───────────────────────────────────────────────────────────────────────────
  async createRecvTransport() {
    if (this.recvTransport) return this.recvTransport;

    return new Promise((resolve, reject) => {
      socketService.createTransport('recv', (tp) => {
        if (!tp || tp.error) {
          const e = tp?.error || 'no transport params';
          ERR('createRecvTransport ack error', e);
          return reject(new Error(e));
        }

        this.recvTransport = this.device.createRecvTransport(tp);
        LOG('recvTransport created', this.recvTransport.id);

        this.recvTransport.on(
          'connect',
          ({ dtlsParameters }, callback, errback) => {
            LOG('recvTransport.on(connect) → RPC connectTransport');
            socketService.connectTransport(
              this.recvTransport.id,
              dtlsParameters,
              ({ connected, error }) => {
                if (error) {
                  ERR('connectTransport error', error);
                  return errback(new Error(error));
                }
                if (connected) {
                  LOG('recvTransport connected');
                  callback();
                } else {
                  ERR('connectTransport not connected');
                  errback(new Error('Failed to connect recv transport'));
                }
              }
            );
          }
        );

        resolve(this.recvTransport);
      });
    });
  }

  // // ───────────────────────────────────────────────────────────────────────────
  // // produce()
  // //
  // // Creates a Producer for a local audio track.
  // // Applies Opus codec tuning + registers clean-up handlers.
  // // ───────────────────────────────────────────────────────────────────────────
  // async produce(track) {
  //   if (!this.sendTransport)
  //     throw new Error('No send transport');

  //   try {
  //     const producer = await this.sendTransport.produce({
  //       track,
  //       codecOptions: {
  //         opusStereo: true,  // Enable stereo
  //         opusDtx: false,    // Disable discontinuous transmission
  //         opusFec: true,     // Enable forward error correction
  //       },
  //     });

  //     this.producers.set(producer.id, producer);
  //     LOG('producing audio', producer.id);

  //     producer.on('trackended', () =>
  //       LOG('producer trackended', producer.id)
  //     );

  //     producer.on('transportclose', () => {
  //       LOG('producer transportclose', producer.id);
  //       this.producers.delete(producer.id);
  //     });

  //     return producer;
  //   } catch (err) {
  //     ERR('produce error', err);
  //     throw err;
  //   }
  // }

  // ───────────────────────────────────────────────────────────────────────────
  // --- MODIFIED: produce() ---
  //
  // Creates a Producer for a local audio OR video track.
  // Now accepts userCodecOptions AND video constraints.
  // Applies Simulcast for video.
  // ───────────────────────────────────────────────────────────────────────────
  async produce(track, userCodecOptions = {}, videoConstraints = {}) {
    if (!this.sendTransport)
      throw new Error('No send transport');

    let codecOptions = {};
    let encodings; // This will hold our simulcast settings
    const appData = { kind: track.kind }; // Pass track kind to appData

    if (track.kind === 'audio') {
      // --- Audio Logic ---
      const defaultAudioCodecOptions = {
        opusStereo: true,
        opusDtx: false,
        opusFec: true,
      };
      codecOptions = { 
        ...defaultAudioCodecOptions, 
        ...userCodecOptions 
      };
      LOG('producing AUDIO with codecOptions:', codecOptions);

    } else if (track.kind === 'video') {
      // --- Video Logic (NEW) ---
      codecOptions = { 
        ...userCodecOptions
        // Note: We don't have any specific H264 options here, but you could add them.
      };
      
      // Get resolution from constraints
      const height = videoConstraints.height?.ideal || 720;
      const framerate = videoConstraints.frameRate?.ideal || 30;

      // Simulcast encodings: low, medium, high
      // These are standard settings for 720p.
      if (height >= 720) {
        encodings = [
          { 
            scaleResolutionDownBy: 4, // 180p
            maxBitrate: 300000, 
            maxFramerate: 15, // Low-res layer doesn't need high FPS
          },
          { 
            scaleResolutionDownBy: 2, // 360p
            maxBitrate: 900000, 
            maxFramerate: 15 
          },
          { 
            scaleResolutionDownBy: 1, // 720p
            maxBitrate: 2500000, 
            maxFramerate: framerate 
          },
        ];
      } else if (height >= 360) {
        // Settings for 360p input
         encodings = [
          { 
            scaleResolutionDownBy: 2, // 180p
            maxBitrate: 300000, 
            maxFramerate: 15, 
          },
          { 
            scaleResolutionDownBy: 1, // 360p
            maxBitrate: 900000, 
            maxFramerate: framerate 
          },
        ];
      } else {
        // Fallback for very low resolution
         encodings = [
          { 
            scaleResolutionDownBy: 1,
            maxBitrate: 500000, 
            maxFramerate: framerate 
          },
        ];
      }
      
      LOG('producing VIDEO with encodings:', encodings);
    }

    try {
      const producer = await this.sendTransport.produce({
        track,
        encodings,     // <-- This is undefined for audio, set for video
        codecOptions,  // <-- This is set for audio, empty for video
        appData,       // <-- Pass kind to server
      });

      this.producers.set(producer.id, producer);
      LOG(`producing ${track.kind}`, producer.id);

      producer.on('trackended', () =>
        LOG(`producer trackended (${track.kind})`, producer.id)
      );

      producer.on('transportclose', () => {
        LOG(`producer transportclose (${track.kind})`, producer.id);
        this.producers.delete(producer.id);
      });

      return producer;
    } catch (err) {
      ERR(`produce error (${track.kind})`, err);
      throw err;
    }
  }
  // --- END OF MODIFIED produce() ---

  // ───────────────────────────────────────────────────────────────────────────
  // consume()
  //
  // Main flow:
  //   1. Ask server for consumer parameters (server-side paused Consumer)
  //   2. Create mediasoup-client Consumer
  //   3. Notify server to "resume" the Consumer (START sending audio)
  //
  // This prevents race conditions & audio pops.
  // ───────────────────────────────────────────────────────────────────────────
  async consume(producerId) {
    if (!this.recvTransport) throw new Error('No recv transport');
    if (!this.device?.loaded) throw new Error('Device not loaded');

    return new Promise((resolve, reject) => {
      socketService.consume(
        this.recvTransport.id,
        producerId,
        this.device.rtpCapabilities,
        async (params) => {
          if (!params || params.error) {
            const e = params?.error || 'bad consume params';
            ERR('consume ack error', e, params);
            return reject(new Error(e));
          }

          try {
            // Construct mediasoup-client Consumer
            const consumer = await this.recvTransport.consume(params);
            this.consumers.set(consumer.id, consumer);

            LOG('consumer created', {
              consumerId: consumer.id,
              producerId
            });

            consumer.on('transportclose', () => {
              LOG('consumer transportclose', consumer.id);
              this.consumers.delete(consumer.id);
            });

            // ───────────────────────────────────────────────
            // THE FIX:
            // Server created Consumer PAUSED → must resume explicitly.
            // Without this, no audio ever flows.
            // ───────────────────────────────────────────────
            socketService.resumeConsumer(
              consumer.id,
              ({ resumed, error }) => {
                if (error) {
                  ERR('resumeConsumer ack error', error);
                  return reject(new Error(error));
                }
                if (resumed) {
                  LOG('consumer.resume OK (via server)', consumer.id);
                  resolve(consumer);
                } else {
                  reject(new Error('Failed to resume consumer'));
                }
              }
            );

          } catch (err) {
            ERR('recvTransport.consume error', err);
            reject(err);
          }
        }
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // createDataProducer()
  //
  // Creates a DataProducer (outgoing DataChannel).
  // Automatically waits for "open" before resolving.
  //
  // Used for:
  //   • metronome ticks
  //   • chat
  //   • control messages
  // ───────────────────────────────────────────────────────────────────────────
  async createDataProducer({
    label = 'metronome',
    protocol = 'json',
    appData = {},
  } = {}) {
    await this.createSendTransport();

    // Create local RTCDataChannel
    const dp = await this.sendTransport.produceData({
      ordered: false,
      maxRetransmits: 0, // "ultra-low-latency" lossy mode
      label,
      protocol,
      appData,
    });

    console.log(
      '[MS] DataProducer created',
      dp.id,
      { label: dp.label, protocol: dp.protocol, readyState: dp.readyState }
    );

    this.dataProducers.set(dp.id, dp);

    dp.on('open', () => console.log('[MS] DataProducer open', dp.id));
    dp.on('close', () => console.log('[MS] DataProducer close', dp.id));
    dp.on('error', (e) => console.error('[MS] DataProducer error', dp.id, e));

    dp.on('transportclose', () => {
      console.log('[MS] DataProducer transportclose', dp.id);
      this.dataProducers.delete(dp.id);
    });

    // Wait for RTCDataChannel to open before resolving
    if (dp.readyState !== 'open') {
      await new Promise((resolve, reject) => {
        const to = setTimeout(() =>
          reject(new Error('DataProducer open timeout')),
          7000
        );

        const onOpen = () => {
          clearTimeout(to);
          dp.off('error', onErr);
          resolve();
        };

        const onErr = (e) => {
          clearTimeout(to);
          dp.off('open', onOpen);
          reject(e);
        };

        dp.once('open', onOpen);
        dp.once('error', onErr);
      });
    }

    console.log('[MS] DataProducer ready (open)', dp.id);
    return dp;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // consumeData()
  //
  // Creates a DataConsumer (incoming DataChannel).
  // Hooks up message parsing and transportclose cleanup.
  // ───────────────────────────────────────────────────────────────────────────
  async consumeData(dataProducerId, onMessage) {
    await this.createRecvTransport();
    if (!this.device?.loaded) throw new Error('Device not loaded');

    return new Promise((resolve, reject) => {
      socketService.consumeData(
        this.recvTransport.id,
        dataProducerId,
        async (res = {}) => {
          const { id, streamId, error } = res;
          if (error) {
            ERR('consumeData ack error', error, res);
            return reject(new Error(error));
          }
          if (!id || typeof streamId !== 'number') {
            ERR('consumeData ack missing fields', res);
            return reject(new Error('consumeData ack missing id/streamId'));
          }

          const params = {
            id,
            dataProducerId,
            sctpStreamParameters: { streamId },
          };

          LOG('recvTransport.consumeData params', params);

          try {
            const dataConsumer = await this.recvTransport.consumeData(params);
            this.dataConsumers.set(dataConsumer.id, dataConsumer);

            LOG('DataConsumer created', dataConsumer.id);

            // Message event — parse JSON or text gracefully
            dataConsumer.on('message', (data) => {
              try {
                const text = data instanceof ArrayBuffer
                  ? new TextDecoder().decode(data)
                  : String(data);

                const parsed = (() => {
                  try { return JSON.parse(text); }
                  catch { return text; }
                })();

                onMessage?.(parsed);
              } catch (e) {
                WARN('DataConsumer message parse error', e);
              }
            });

            dataConsumer.on('transportclose', () => {
              LOG('DataConsumer transportclose', dataConsumer.id);
              this.dataConsumers.delete(dataConsumer.id);
            });

            resolve(dataConsumer);
          } catch (err) {
            ERR('recvTransport.consumeData error', err);
            reject(err);
          }
        }
      );
    });
  }
}

// Export singleton instance
export const mediasoupService = new MediasoupService();
