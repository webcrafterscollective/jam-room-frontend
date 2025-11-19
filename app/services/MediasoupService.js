// services/MediasoupService.js
// ───────────────────────────────────────────────────────────────────────────────
// Client-side Mediasoup controller.
// This encapsulates:
//   • mediasoup-client.Device
//   • Send & Recv WebRTC Transports
//   • Producers/Consumers & DataProducers/DataConsumers
// ───────────────────────────────────────────────────────────────────────────────

import * as mediasoupClient from 'mediasoup-client';
import { socketService } from './SocketService';

const LOG = (...a) => console.log('[MS]', ...a);
const WARN = (...a) => console.warn('[MS]', ...a);
const ERR = (...a) => console.error('[MS]', ...a);

class MediasoupService {
  device = null;          // mediasoup-client Device
  sendTransport = null;   // Outgoing WebRTC transport
  recvTransport = null;   // Incoming WebRTC transport
  producers = new Map();  // media Producers (local)
  consumers = new Map();  // media Consumers (remote)
  dataProducers = new Map(); // DataChannel senders
  dataConsumers = new Map(); // DataChannel receivers

  constructor() {
    this.device = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Core: Load Device & Create Transports
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

  async createSendTransport() {
    if (this.sendTransport) return this.sendTransport;

    return new Promise((resolve, reject) => {
      socketService.createTransport('send', (tp) => {
        if (!tp || tp.error) return reject(new Error(tp?.error || 'no transport params'));

        this.sendTransport = this.device.createSendTransport(tp);
        
        this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketService.connectTransport(this.sendTransport.id, dtlsParameters, res => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });

        this.sendTransport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
          socketService.produce(this.sendTransport.id, kind, rtpParameters, res => {
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id });
          });
        });

        this.sendTransport.on('producedata', ({ sctpStreamParameters, label, protocol }, callback, errback) => {
          socketService.produceData(this.sendTransport.id, { label, protocol, sctpStreamParameters }, res => {
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id });
          });
        });

        resolve(this.sendTransport);
      });
    });
  }

  async createRecvTransport() {
    if (this.recvTransport) return this.recvTransport;

    return new Promise((resolve, reject) => {
      socketService.createTransport('recv', (tp) => {
        if (!tp || tp.error) return reject(new Error(tp?.error || 'no transport params'));

        this.recvTransport = this.device.createRecvTransport(tp);
        
        this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketService.connectTransport(this.recvTransport.id, dtlsParameters, res => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });

        resolve(this.recvTransport);
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Media: Produce & Consume
  // ───────────────────────────────────────────────────────────────────────────
  async produce(track, userCodecOptions = {}, videoConstraints = {}) {
    if (!this.sendTransport) throw new Error('No send transport');

    let codecOptions = {};
    let encodings;
    const appData = { kind: track.kind };

    if (track.kind === 'audio') {
      codecOptions = {
        opusStereo: true,
        opusDtx: false,
        opusFec: true,
        ...userCodecOptions
      };
    } else if (track.kind === 'video') {
      codecOptions = { ...userCodecOptions };
      // Simple simulcast settings based on height
      const height = videoConstraints.height?.ideal || 720;
      const fps = videoConstraints.frameRate?.ideal || 30;
      
      if (height >= 720) {
        encodings = [
          { scaleResolutionDownBy: 4, maxBitrate: 300000, maxFramerate: 15 },
          { scaleResolutionDownBy: 2, maxBitrate: 900000, maxFramerate: 15 },
          { scaleResolutionDownBy: 1, maxBitrate: 2500000, maxFramerate: fps },
        ];
      } else {
        encodings = [{ scaleResolutionDownBy: 1, maxBitrate: 500000, maxFramerate: fps }];
      }
    }

    const producer = await this.sendTransport.produce({ track, encodings, codecOptions, appData });
    this.producers.set(producer.id, producer);
    
    producer.on('transportclose', () => this.producers.delete(producer.id));
    return producer;
  }

  async consume(producerId) {
    if (!this.recvTransport) throw new Error('No recv transport');

    return new Promise((resolve, reject) => {
      socketService.consume(
        this.recvTransport.id, 
        producerId, 
        this.device.rtpCapabilities, 
        async (params) => {
          if (!params || params.error) return reject(new Error(params?.error));

          try {
            const consumer = await this.recvTransport.consume(params);
            this.consumers.set(consumer.id, consumer);
            
            consumer.on('transportclose', () => this.consumers.delete(consumer.id));

            // Resume on server side
            socketService.resumeConsumer(consumer.id, ({ resumed, error }) => {
              if (error) reject(new Error(error));
              else resolve(consumer);
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Latency & Stats Tools
  // ───────────────────────────────────────────────────────────────────────────
  
  /**
   * Tune the jitter buffer for a specific consumer.
   * delaySec: 0 for minimum latency, >0 for smoother playback.
   */
  setConsumerPlayoutDelay(consumerId, delaySec) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return;
    
    const receiver = consumer.rtpReceiver;
    // Standard property for jitter buffer hint
    if (receiver && 'playoutDelayHint' in receiver) {
      receiver.playoutDelayHint = delaySec;
    }
  }

  /**
   * Get raw WebRTC stats for a consumer to analyze latency.
   */
  async getConsumerStats(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return null;
    return await consumer.getStats();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Data Channels (Metronome)
  // ───────────────────────────────────────────────────────────────────────────
  async createDataProducer({ label = 'metronome', protocol = 'json', appData = {} } = {}) {
    await this.createSendTransport();
    
    const dp = await this.sendTransport.produceData({
      ordered: false,
      maxRetransmits: 0,
      label,
      protocol,
      appData,
    });

    this.dataProducers.set(dp.id, dp);
    dp.on('transportclose', () => this.dataProducers.delete(dp.id));
    
    // Wait for open if needed
    if (dp.readyState !== 'open') {
       await new Promise(resolve => dp.once('open', resolve));
    }
    return dp;
  }

  async consumeData(dataProducerId, onMessage) {
    await this.createRecvTransport();
    
    return new Promise((resolve, reject) => {
      socketService.consumeData(this.recvTransport.id, dataProducerId, async (res) => {
        if (res.error) return reject(new Error(res.error));
        
        try {
          const { id, streamId } = res;
          const dc = await this.recvTransport.consumeData({ id, dataProducerId, sctpStreamParameters: { streamId } });
          this.dataConsumers.set(dc.id, dc);
          
          dc.on('message', (data) => {
            // Handle both string and binary data
            try {
              const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
              onMessage?.(JSON.parse(text));
            } catch {
              onMessage?.(data);
            }
          });
          
          dc.on('transportclose', () => this.dataConsumers.delete(dc.id));
          resolve(dc);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

export const mediasoupService = new MediasoupService();