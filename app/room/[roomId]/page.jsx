'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { socketService } from '@/app/services/SocketService';
import { mediasoupService } from '@/app/services/MediasoupService';

const LOG = (...args) => console.log('[ROOM]', ...args);
const WARN = (...args) => console.warn('[ROOM]', ...args);
const ERR = (...args) => console.error('[ROOM]', ...args);

// -----------------------------------------------------------------------------
// UI ICONS
// -----------------------------------------------------------------------------
const IconMic = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z" />
  </svg>
);
const IconMicOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm-3.75 3a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75ZM12 15.75a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm.75 2.25a.75.75 0 0 0 1.5 0v-.75a.75.75 0 0 0-1.5 0v.75ZM12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Zm-3.938-6.528A4.5 4.5 0 0 0 6 12v1.5M18 12a4.486 4.486 0 0 0-3.062-4.028M18 13.5v-1.5a4.5 4.5 0 1 0-9 0v1.5m-3.062 4.028A4.486 4.486 0 0 1 6 12m6 9.75v-3.75M3.75 3.75l16.5 16.5" />
  </svg>
);
const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L8.029 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
  </svg>
);
const IconStop = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
);
const IconPlug = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l-4.24-4.24m5.83-5.83L15.17 11.42M12.75 5.1a.75.75 0 0 0-1.06 0l-4.24 4.24a.75.75 0 0 0 0 1.06l4.24 4.24a.75.75 0 0 0 1.06 0l4.24-4.24a.75.75 0 0 0 0-1.06l-4.24-4.24Z" />
  </svg>
);
const IconPlugOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l-4.24-4.24m5.83-5.83L15.17 11.42M12.75 5.1a.75.75 0 0 0-1.06 0l-4.24 4.24a.75.75 0 0 0 0 1.06l4.24 4.24a.75.75 0 0 0 1.06 0l4.24-4.24a.75.75 0 0 0 0-1.06l-4.24-4.24ZM3 3l18 18" />
  </svg>
);
const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);
const IconMetronome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v6m0 6v6m6-6h6m-6 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);
const IconSpeaker = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>
);

// -----------------------------------------------------------------------------
// RemoteAudio Component
// --- MODIFIED: Added outputDeviceId prop ---
// -----------------------------------------------------------------------------
function RemoteAudio({ consumer, outputDeviceId }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    const track = consumer?.track;
    const consumerId = consumer?.id; 

    LOG(`[RemoteAudio] effect running for ${consumerId}`, {
      hasElement: !!el,
      hasTrack: !!track,
      trackId: track?.id,
      trackReadyState: track?.readyState,
      outputDeviceId, // <-- Log the new prop
    });

    if (!el || !track) {
      LOG(`[RemoteAudio] effect cleanup for ${consumerId}: No element or track. Bailing.`);
      return;
    }

    // --- Audio Element Event Listeners ---
    const onPlay = () => LOG(`[RemoteAudio EVENT (${consumerId})] ✅ onPlay`, { currentTime: el.currentTime, paused: el.paused });
    const onPlaying = () => LOG(`[RemoteAudio EVENT (${consumerId})] ✅ onPlaying`, { volume: el.volume });
    const onPause = () => LOG(`[RemoteAudio EVENT (${consumerId})] ⏸️ onPause`);
    const onStalled = () => WARN(`[RemoteAudio EVENT (${consumerId})] ⚠️ onStalled (network issue?)`);
    const onSuspend = () => WARN(`[RemoteAudio EVENT (${consumerId})] ⚠️ onSuspend (loading suspended)`);
    const onAbort = () => ERR(`[RemoteAudio EVENT (${consumerId})] 🛑 onAbort (load aborted)`);
    const onCanPlay = () => LOG(`[RemoteAudio EVENT (${consumerId})] 👍 onCanPlay (ready to play)`);
    const onError = () => {
      ERR(`[RemoteAudio EVENT (${consumerId})] 🛑 onError`, {
        errorName: el.error?.name,
        errorMessage: el.error?.message,
        errorCode: el.error?.code,
      });
    };
    el.addEventListener('play', onPlay);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('stalled', onStalled);
    el.addEventListener('suspend', onSuspend);
    el.addEventListener('abort', onAbort);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);

    // --- Attaching the Stream ---
    LOG(`[RemoteAudio] Attaching stream for ${consumerId}. Track readyState: ${track.readyState}`);
    const stream = new MediaStream();
    stream.addTrack(track);
    el.srcObject = stream;
    LOG(`[RemoteAudio] srcObject set for ${consumerId}. Track enabled: ${track.enabled}, muted: ${track.muted}`);

    // --- NEW: Set Output Device (Speaker) ---
    if (outputDeviceId && typeof el.setSinkId === 'function') {
      el.setSinkId(outputDeviceId)
        .then(() => {
          LOG(`[RemoteAudio] Set output device OK: ${outputDeviceId}`);
        })
        .catch(err => {
          ERR(`[RemoteAudio] Failed to set output device:`, err);
        });
    } else if (outputDeviceId) {
      WARN('[RemoteAudio] el.setSinkId is not a function. Cannot set output device.');
    }
    // --- END NEW ---

    // --- Cleanup Function ---
    return () => {
      LOG(`[RemoteAudio] cleanup running for ${consumerId}`);
      if (el) {
        el.removeEventListener('play', onPlay);
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('stalled', onStalled);
        el.removeEventListener('suspend', onSuspend);
        el.removeEventListener('abort', onAbort);
        el.removeEventListener('canplay', onCanPlay);
        el.removeEventListener('error', onError);
        el.srcObject = null;
        LOG(`[RemoteAudio] cleanup complete for ${consumerId}`);
      }
    };
  }, [consumer, consumer?.track, outputDeviceId]); // <-- ADDED outputDeviceId to dependency array

  return (
    <div className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between gap-4 border border-neutral-700">
      <div className="flex items-center gap-3">
        <div className="text-green-500 flex-shrink-0">
          <IconSpeaker />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-200">
            Jammer
          </p>
          <p className="text-xs font-mono text-neutral-400 break-all">
            {consumer?.producerId}
          </p>
        </div>
      </div>
      <audio ref={audioRef} autoPlay playsInline muted={false} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Checkbox Component (Helper for new settings UI)
// -----------------------------------------------------------------------------
const SettingsCheckbox = ({ label, description, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-3 p-3 rounded-lg transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800 cursor-pointer'}`}>
    <input
      type="checkbox"
      className="w-5 h-5 rounded-md bg-neutral-700 border-neutral-600 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <div>
      <p className="text-sm font-medium text-neutral-200">{label}</p>
      <p className="text-xs text-neutral-400">{description}</p>
    </div>
  </label>
);

// -----------------------------------------------------------------------------
// Select Component (Helper for new settings UI)
// -----------------------------------------------------------------------------
const SettingsSelect = ({ label, value, onChange, disabled, children }) => (
  <div className="p-3">
    <label className="block text-sm font-medium text-neutral-200 mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-neutral-700 border border-neutral-600 text-neutral-200 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
    >
      {children}
    </select>
  </div>
);


// -----------------------------------------------------------------------------
// RoomPage Component (Main)
// -----------------------------------------------------------------------------

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomid || params.roomId;

  // ────────────────────────────────────────────────────────────────────────────
  // Connection / mediasoup state
  // ────────────────────────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [myProducer, setMyProducer] = useState(null);
  const [participantIds, setParticipantIds] = useState([]);
  const [availableProducers, setAvailableProducers] = useState(new Map());
  const [consumingProducers, setConsumingProducers] = useState(new Map());

  // ────────────────────────────────────────────────────────────────────────────
  // Metronome (DataChannel) state
  // ────────────────────────────────────────────────────────────────────────────
  const [metronomeLeaderSocketId, setMetronomeLeaderSocketId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [metronomeDataProducer, setMetronomeDataProducer] = useState(null);
  const [isMetronomeConsuming, setIsMetronomeConsuming] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const clickBufferRef = useRef(null);
  const metronomeStateRef = useRef({ isEnabled: false });
  const metronomeSenderRef = useRef({ dp: null, interval: null });
  const firstUnmountRef = useRef(false);

  // ────────────────────────────────────────────────────────────────────────────
  // --- NEW: Audio Control State ---
  // ────────────────────────────────────────────────────────────────────────────
  
  // Device Lists
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);

  // Selected Device IDs
  const [selectedInputId, setSelectedInputId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');

  // getUserMedia constraints
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [sampleRate, setSampleRate] = useState('48000');
  const [latency, setLatency] = useState('0.01'); // 10ms 'interactive' hint

  // Mediasoup Opus codec controls
  const [opusStereo, setOpusStereo] = useState(true);
  const [opusDtx, setOpusDtx] = useState(false);
  const [opusFec, setOpusFec] = useState(true);
  
  // ────────────────────────────────────────────────────────────────────────────
  // --- NEW: Helper Function to Get Audio Devices ---
  // ────────────────────────────────────────────────────────────────────────────
  const updateAudioDevices = async () => {
    try {
      LOG('Updating audio devices...');
      await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');

      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Set default selection
      if (!selectedInputId && inputs.length > 0) {
        setSelectedInputId(inputs[0].deviceId);
      }
      if (!selectedOutputId && outputs.length > 0) {
        setSelectedOutputId(outputs[0].deviceId);
      }
      LOG(`Devices found: ${inputs.length} inputs, ${outputs.length} outputs`);
    } catch (err) {
      ERR('Error enumerating devices:', err);
      // This often happens if user denies mic permission
    }
  };


  // ────────────────────────────────────────────────────────────────────────────
  // --- useEffect 1 (Boot & Lifecycle) ---
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    LOG('boot useEffect start', {
      NODE_ENV: process.env.NODE_ENV,
      SIGNAL_URL:
        process.env.NEXT_PUBLIC_SIGNAL_URL || 'http://localhost:4000',
      roomId,
    });

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;
    LOG('AudioContext state', ctx.state);

    (async () => {
      try {
        const res = await fetch('/click.mp3');
        const buf = await res.arrayBuffer();
        clickBufferRef.current = await ctx.decodeAudioData(buf);
        LOG('Metronome click loaded OK');
      } catch (e) {
        ERR('Failed to load /click.mp3', e);
      }
    })();

    const onBeforeUnload = () => {
      LOG('beforeunload → disconnect');
      socketService.disconnect();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      LOG('boot useEffect cleanup start');
      if (
        process.env.NODE_ENV !== 'production' &&
        !firstUnmountRef.current
      ) {
        firstUnmountRef.current = true;
        LOG(
          'dev double-unmount guard: skipping disconnect on first cleanup'
        );
        window.removeEventListener('beforeunload', onBeforeUnload);
        return;
      }
      window.removeEventListener('beforeunload', onBeforeUnload);
      LOG('cleanup → disconnect now');
      socketService.disconnect(); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); 

  // ────────────────────────────────────────────────────────────────────────────
  // --- useEffect 2 (Socket Listeners) ---
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    LOG('Registering socket listeners...', { metronomeLeaderSocketId, metronomeDataProducerId: metronomeDataProducer?.id });

    const off1 = socketService.onParticipantJoined(({ socketId }) => {
      LOG('[SOCKET] participantJoined', socketId);
      setParticipantIds((prev) => [...prev, socketId]);
    });

    const off2 = socketService.onParticipantLeft(({ socketId }) => {
      LOG('[SOCKET] participantLeft', socketId);
      setParticipantIds((prev) => prev.filter((id) => id !== socketId));
    });

    const off3 = socketService.onMediaProducerCreated(
      ({ producerId, kind, ownerSocketId }) => {
        LOG('[SOCKET] mediaProducerCreated', {
          producerId,
          kind,
          ownerSocketId,
        });
        setAvailableProducers((prev) => {
          const next = new Map(prev);
          next.set(producerId, { kind, ownerSocketId });
          return next;
        });
      }
    );

    const off4 = socketService.onMediaProducerClosed(({ producerId }) => {
      LOG('[SOCKET] mediaProducerClosed', producerId);
      setAvailableProducers((prev) => {
        const next = new Map(prev);
        next.delete(producerId);
        return next;
      });
      setConsumingProducers((prev) => {
        const next = new Map(prev);
        const entry = next.get(producerId);
        if (entry?.consumer) {
          try {
            entry.consumer.close();
            LOG('Closed local consumer due to remote producer close', producerId);
          } catch (e) {
            WARN('Error closing consumer on producerClose', e);
          }
        }
        next.delete(producerId);
        return next;
      });
    });

    const off5 = socketService.onDataProducerCreated(
      ({ dataProducerId, label, ownerSocketId }) => {
        LOG('[SOCKET] dataProducerCreated', {
          dataProducerId,
          label,
          ownerSocketId,
          leader: metronomeLeaderSocketId,
        });
        if (label === 'metronome' && ownerSocketId === metronomeLeaderSocketId) {
          setMetronomeDataProducer({ id: dataProducerId, label, ownerSocketId });
        }
      }
    );

    const off6 = socketService.on('newMetronomeLeader', ({ leaderSocketId }) => {
      LOG('[SOCKET] newMetronomeLeader', leaderSocketId);
      setMetronomeLeaderSocketId(leaderSocketId);
      setIsLeader(!!leaderSocketId && leaderSocketId === socketService.socket?.id);
      setIsMetronomeConsuming(false);
      setMetronomeDataProducer(null);
    });

    const off7 = socketService.on('dataProducerClosed', ({ dataProducerId }) => {
      LOG('[SOCKET] dataProducerClosed', dataProducerId);
      if (metronomeDataProducer?.id === dataProducerId) {
        setMetronomeDataProducer(null);
        setIsMetronomeConsuming(false);
      }
    });

    return () => {
      LOG('Cleaning up socket listeners...');
      off1();
      off2();
      off3();
      off4();
      off5();
      off6();
      off7();
    };
  }, [metronomeLeaderSocketId, metronomeDataProducer?.id]);


  // ────────────────────────────────────────────────────────────────────────────
  // Connect → join → load device → create recv transport
  // ────────────────────────────────────────────────────────────────────────────
  const handleConnect = () => {
    if (isConnected) {
      LOG('Already connected; ignoring handleConnect');
      return;
    }

    const SIGNAL =
      process.env.NEXT_PUBLIC_SIGNAL_URL || 'http://localhost:4000';
    LOG('Connecting to signaling…', SIGNAL);

    socketService.connect(SIGNAL, async () => {
      LOG(
        'socketService.connect() callback fired; socketId:',
        socketService.socket?.id
      );

      socketService.socket?.on('disconnect', (r) =>
        LOG('[client] disconnect:', r)
      );
      socketService.socket?.on('connect_error', (e) =>
        ERR('[client] connect_error:', e?.message)
      );
      socketService.socket?.on('reconnect', (n) =>
        LOG('[client] reconnect attempt:', n)
      );

      socketService.joinRoom(roomId, async (reply) => {
        LOG('joinRoom reply:', reply);
        if (reply?.error) {
          ERR('joinRoom error:', reply.error);
          return;
        }

        const {
          routerRtpCapabilities,
          existingProducers = [],
          existingDataProducers = [], 
          otherParticipantIds = [],
          metronomeLeaderSocketId: leaderId = null,
        } = reply;

        setParticipantIds(otherParticipantIds || []);

        LOG('Joined room snapshot', {
          otherParticipantIds,
          leaderId,
          existingProducersCount: existingProducers.length,
        });

        try {
          await mediasoupService.loadDevice(routerRtpCapabilities);
          LOG('Mediasoup device loaded');
        } catch (e) {
          ERR('Device load failed', e);
          return;
        }

        try {
          await mediasoupService.createRecvTransport();
          LOG('Receive transport created');
        } catch (e) {
          ERR('Recv transport create failed', e);
          return;
        }

        const seeded = new Map();
        for (const p of existingProducers) {
          if (p.kind === 'audio') {
            seeded.set(p.producerId, {
              kind: p.kind,
              ownerSocketId: p.ownerSocketId,
            });
          }
        }
        setAvailableProducers(seeded);
        LOG('Seeded availableProducers:', Array.from(seeded.keys()));

        setMetronomeLeaderSocketId(leaderId);
        setIsLeader(
          !!leaderId && leaderId === socketService.socket?.id
        );
        LOG(
          'Leader? ',
          leaderId,
          'isLeader=',
          !!leaderId &&
            leaderId === socketService.socket?.id
        );

        const leaderMetro = existingDataProducers.find(dp => 
          dp.label === 'metronome' && dp.ownerSocketId === leaderId
        );
        if (leaderMetro) {
          LOG('Seeding existing metronome producer', leaderMetro);
          setMetronomeDataProducer({
            id: leaderMetro.dataProducerId,
            label: leaderMetro.label,
            ownerSocketId: leaderMetro.ownerSocketId
          });
        }

        setIsConnected(true);
      });
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Producer (mic)
  // --- MODIFIED: Uses all new audio settings ---
  // ────────────────────────────────────────────────────────────────────────────
  const handleGetMic = async () => {
    LOG('Get microphone clicked');

    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
        LOG('AudioContext resumed on mic grant');
      }

      // --- NEW: Populate devices on first click ---
      // This is the first time we are allowed to ask for device lists
      if (inputDevices.length === 0) {
        await updateAudioDevices();
      }
      
      const audioConstraints = {
        echoCancellation: echoCancellation,
        noiseSuppression: noiseSuppression,
        autoGainControl: autoGainControl,
        // Use selected deviceId if available
        deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
        // Add advanced constraints
        sampleRate: { ideal: parseInt(sampleRate, 10) },
        latency: parseFloat(latency)
      };
      
      LOG('Requesting microphone with constraints:', audioConstraints);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      setLocalStream(stream);
      LOG(
        'Got mic stream with tracks:',
        stream.getTracks().map((t) => ({ id: t.id, kind: t.kind }))
      );
    } catch (err) {
      ERR('Error getting microphone:', err);
      alert(`Error getting mic: ${err.message}. Your hardware might not support the selected settings.`);
    }
  };

  const handleStartProducing = async () => {
    if (!localStream) {
      WARN('StartProducing without mic stream');
      alert('Get microphone first');
      return;
    }
    LOG('StartProducing…');
    try {
      await mediasoupService.createSendTransport();
      LOG('Send transport ready');
      const track = localStream.getAudioTracks()[0];

      // Pass the Opus codec settings from our state
      const producer = await mediasoupService.produce(track, {
        opusStereo: opusStereo,
        opusDtx: opusDtx,
        opusFec: opusFec,
      });
      
      setMyProducer(producer);
      LOG('Producing audio; producerId=', producer?.id);
    } catch (e) {
      ERR('StartProducing failed', e);
    }
  };

  const handleStopProducing = () => {
    if (!myProducer) return;
    LOG('StopProducing; closing producer', myProducer.id);
    try { myProducer.close(); } catch (e) { WARN('producer.close error', e); }
    setMyProducer(null);

    // Stop and clear the local stream
    // This allows user to click "Get Microphone" again with new settings
    try {
      localStream?.getTracks().forEach(track => track.stop());
    } catch (e) {
      WARN('localStream.stop error', e);
    }
    setLocalStream(null);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Consumers (audio)
  // ────────────────────────────────────────────────────────────────────────────
  const handleConsume = async (producerId) => {
    LOG('Consume clicked for', producerId);
    try {
      const consumer = await mediasoupService.consume(producerId);

      if (!consumer) {
        WARN('mediasoupService.consume returned null for', producerId);
        return;
      }
      LOG('Got consumer from mediasoupService', {
        consumerId: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        paused: consumer.paused, 
        trackId: consumer.track?.id,
        trackReadyState: consumer.track?.readyState,
      });
      
      setConsumingProducers((prev) => {
        const next = new Map(prev);
        next.set(producerId, { consumer });
        return next;
      });
      LOG('Now consuming', producerId, '-> consumerId:', consumer.id, 'kind:', consumer.kind);
    } catch (err) {
      ERR('consume failed:', err);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Metronome (DataChannel)
  // ────────────────────────────────────────────────────────────────────────────
  const playClick = () => {
    if (!audioContextRef.current || !clickBufferRef.current) {
      WARN('playClick called without audioContext or buffer');
      return;
    }
    const state = audioContextRef.current.state;
    if (state === 'suspended') {
      LOG('AudioContext is suspended; click may be silent until resume()');
    }
    const src = audioContextRef.current.createBufferSource();
    src.buffer = clickBufferRef.current;
    src.connect(audioContextRef.current.destination);
    src.start(0);
  };

  const startLeaderMetronome = async (bpm = 120) => {
    LOG('[ROOM] startLeaderMetronome request; isLeader?', isLeader, 'bpm', bpm);
    if (!isLeader)
      return alert('Only the leader can start the metronome.');
    await mediasoupService.createSendTransport();
    if (metronomeSenderRef.current.dp) {
      LOG('[ROOM] leader metronome already running; ignoring');
      return;
    }
    const dp = await mediasoupService.createDataProducer({
      label: 'metronome',
      protocol: 'json',
    });
    LOG('[ROOM] leader DataProducer ready', dp.id, dp.readyState);
    metronomeSenderRef.current.dp = dp;
    const periodMs = Math.max(1, Math.floor(60000 / bpm)); 
    metronomeSenderRef.current.interval = setInterval(() => {
      try {
        if (dp.readyState !== 'open') {
          WARN('[ROOM] metronome send skipped; channel not open. state=', dp.readyState);
          return;
        }
        const msg = { type: 'tick', at: Date.now() };
        dp.send(JSON.stringify(msg));
      } catch (e) {
        ERR('[ROOM] metronome send failed', e);
      }
    }, periodMs);
    LOG('[ROOM] metronome interval started', { bpm, periodMs });
  };

  const stopLeaderMetronome = () => {
    LOG('[ROOM] stopLeaderMetronome called');
    const { dp, interval } = metronomeSenderRef.current;
    if (interval) clearInterval(interval);
    metronomeSenderRef.current.interval = null;
    if (dp) {
      try { dp.close?.(); } catch (e) { WARN('[ROOM] dp.close error', e); }
    }
    metronomeSenderRef.current.dp = null;
  };

  const subscribeMetronomeIfReady = async () => {
    if (!metronomeDataProducer?.id) {
      LOG('subscribeMetronomeIfReady: no metronomeDataProducer yet');
      return;
    }
    if (isMetronomeConsuming) {
      LOG('subscribeMetronomeIfReady: already consuming data');
      return;
    }
    LOG('Subscribing to metronome data…', metronomeDataProducer.id);
    await mediasoupService.consumeData(
      metronomeDataProducer.id,
      async (msg) => {
        if (msg?.type === 'tick' && metronomeStateRef.current.isEnabled) {
          if (audioContextRef.current?.state === 'suspended') {
            try { await audioContextRef.current.resume(); LOG('AudioContext resumed for click'); } catch {}
          }
          playClick();
        }
      }
    );
    setIsMetronomeConsuming(true);
  };

  useEffect(() => {
    LOG('metronome effect', {
      isMetronomeEnabled,
      metronomeDataProducerId: metronomeDataProducer?.id,
    });
    if (isMetronomeEnabled) subscribeMetronomeIfReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetronomeEnabled, metronomeDataProducer?.id]);

  const handleToggleMetronome = async () => {
    const next = !isMetronomeEnabled;
    LOG('Toggle metronome →', next);
    setIsMetronomeEnabled(next);
    metronomeStateRef.current.isEnabled = next;
    if (next) {
      if (audioContextRef.current?.state === 'suspended') {
        try { await audioContextRef.current.resume(); LOG('AudioContext resumed on toggle'); } catch {}
      }
      await subscribeMetronomeIfReady();
    }
  };

  // ---------------------------------------------------------------------------
  // Card Component (Helper for styling)
  // ---------------------------------------------------------------------------
  const Card = ({ title, icon, children, className = '' }) => (
    <div className={`bg-neutral-900 border border-neutral-800 p-5 rounded-lg shadow-lg ${className} ${!isConnected ? 'opacity-50 grayscale' : ''}`}>
      <h2 className="text-xl font-semibold mb-4 border-b border-neutral-700 pb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
  
  // ---------------------------------------------------------------------------
  // Button Component (Helper for styling)
  // ---------------------------------------------------------------------------
  const Button = ({ onClick, disabled, children, className = '', icon }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2.5 font-medium text-white rounded-md shadow-sm transition-all flex items-center justify-center gap-2
        ${className} 
        ${disabled ? 'bg-neutral-600 cursor-not-allowed' : 'hover:brightness-110'}
      `}
    >
      {icon}
      <span>{children}</span>
    </button>
  );

  // ---------------------------------------------------------------------------
  // RENDER UI
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Jam Room
            </h1>
            <p className="text-lg text-neutral-400">
              Room ID:{' '}
              <code className="text-indigo-400 bg-neutral-800 px-2 py-1 rounded-md font-mono">
                {roomId}
              </code>
            </p>
          </div>
          <div 
            className={`flex items-center gap-2 py-2 px-4 rounded-lg border
              ${isConnected 
                ? 'bg-green-900/50 border-green-700 text-green-300' 
                : 'bg-red-900/50 border-red-700 text-red-300'
              }
            `}
          >
            {isConnected ? <IconPlug /> : <IconPlugOff />}
            <span className="font-medium text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* --------------------------------------------------- */}
          {/* Left Column: Core Controls                          */}
          {/* --------------------------------------------------- */}
          <div className="md:col-span-1 space-y-6">
            
            <Card title="Connection" icon={<IconPlug />}>
              <Button
                onClick={handleConnect}
                disabled={isConnected}
                className={isConnected ? 'bg-green-700' : 'bg-indigo-600 hover:bg-indigo-500'}
              >
                {isConnected ? 'Connected' : 'Connect to Room'}
              </Button>
            </Card>

            {/* --- MODIFIED: Renamed Card --- */}
            <Card title="Local Audio Settings" icon={<IconMic />} className={!isConnected ? 'pointer-events-none' : ''}>
              
              {/* --- NEW: Device Selectors --- */}
              <SettingsSelect
                label="Input Device (Microphone)"
                value={selectedInputId}
                onChange={(e) => setSelectedInputId(e.target.value)}
                disabled={!!localStream || inputDevices.length === 0}
              >
                {inputDevices.length === 0 && <option>Click "Get Mic" to populate</option>}
                {inputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </SettingsSelect>
              
              <SettingsSelect
                label="Output Device (Speakers)"
                value={selectedOutputId}
                onChange={(e) => setSelectedOutputId(e.target.value)}
                disabled={outputDevices.length === 0}
              >
                {outputDevices.length === 0 && <option>Click "Get Mic" to populate</option>}
                {outputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </SettingsSelect>
              <p className="text-xs text-neutral-400 px-3 -mt-2">
                Note: Metronome audio always uses the system default output.
              </p>
              {/* --- END NEW --- */}


              <div className="pt-4 border-t border-neutral-700 space-y-3">
                <Button
                  onClick={handleGetMic}
                  disabled={!isConnected || !!localStream}
                  className="bg-blue-600 hover:bg-blue-500"
                  icon={<IconMicOff />}
                >
                  {localStream ? 'Mic Active' : 'Get Microphone'}
                </Button>

                {!myProducer ? (
                  <Button
                    onClick={handleStartProducing}
                    disabled={!isConnected || !localStream}
                    className="bg-green-600 hover:bg-green-500"
                    icon={<IconPlay />}
                  >
                    Start Producing
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopProducing}
                    className="bg-red-600 hover:bg-red-500"
                    icon={<IconStop />}
                  >
                    Stop Producing
                  </Button>
                )}
              </div>
              
              <div className="pt-4 border-t border-neutral-700 space-y-1">
                <h3 className="text-sm font-medium text-neutral-300 px-3 pb-2">
                  Mic Processing
                </h3>
                <SettingsCheckbox
                  label="Echo Cancellation"
                  description="Recommended without headphones"
                  checked={echoCancellation}
                  onChange={(e) => setEchoCancellation(e.target.checked)}
                  disabled={!!localStream}
                />
                <SettingsCheckbox
                  label="Noise Suppression"
                  description="Filters out background noise"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  disabled={!!localStream}
                />
                <SettingsCheckbox
                  label="Auto Gain Control"
                  description="Adjusts mic volume automatically"
                  checked={autoGainControl}
                  onChange={(e) => setAutoGainControl(e.target.checked)}
                  disabled={!!localStream}
                />
                {!!localStream && (
                  <p className="text-xs text-indigo-300 px-3 pt-2">
                    Stop your mic to change these settings.
                  </p>
                )}
              </div>
              
              {/* --- NEW: Advanced Sample Rate / Latency --- */}
              <div className="pt-4 border-t border-neutral-700 space-y-1">
                <h3 className="text-sm font-medium text-neutral-300 px-3 pb-2">
                  Mic Quality (Advanced)
                </h3>
                <SettingsSelect
                  label="Sample Rate (Request)"
                  value={sampleRate}
                  onChange={(e) => setSampleRate(e.target.value)}
                  disabled={!!localStream}
                >
                  <option value="48000">48000 Hz (Pro Audio)</option>
                  <option value="44100">44100 Hz (CD Quality)</option>
                  <option value="16000">16000 Hz (Speech)</option>
                </SettingsSelect>
                <SettingsSelect
                  label="Buffer Size / Latency (Hint)"
                  value={latency}
                  onChange={(e) => setLatency(e.target.value)}
                  disabled={!!localStream}
                >
                  <option value="0">0 (Browser Default)</option>
                  <option value="0.005">0.005s (Lowest Latency)</option>
                  <option value="0.01">0.01s (Interactive)</option>
                  <option value="0.02">0.02s (Stable)</option>
                </SettingsSelect>
                {!!localStream && (
                  <p className="text-xs text-indigo-300 px-3 pt-2">
                    Stop your mic to change these settings.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-700 space-y-1">
                <h3 className="text-sm font-medium text-neutral-300 px-3 pb-2">
                  Codec Quality (Advanced)
                </h3>
                <SettingsCheckbox
                  label="Stereo Audio"
                  description="Send 2 channels (music)"
                  checked={opusStereo}
                  onChange={(e) => setOpusStereo(e.target.checked)}
                  disabled={!!myProducer}
                />
                <SettingsCheckbox
                  label="Forward Error Correction (FEC)"
                  description="Better quality on bad networks"
                  checked={opusFec}
                  onChange={(e) => setOpusFec(e.target.checked)}
                  disabled={!!myProducer}
                />
                <SettingsCheckbox
                  label="Discontinuous Transmission (DTX)"
                  description="Stops sending on silence (bad for music)"
                  checked={opusDtx}
                  onChange={(e) => setOpusDtx(e.target.checked)}
                  disabled={!!myProducer}
                />
                {!!myProducer && (
                  <p className="text-xs text-indigo-300 px-3 pt-2">
                    Stop producing to change codec settings.
                  </p>
                )}
              </div>

            </Card>

            <Card title="Metronome" icon={<IconMetronome />} className={!isConnected ? 'pointer-events-none' : ''}>
              <Button
                onClick={handleToggleMetronome}
                disabled={!isConnected || !metronomeLeaderSocketId}
                className={
                  isMetronomeEnabled
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-neutral-700 hover:bg-neutral-600'
                }
              >
                {isMetronomeEnabled ? 'Stop Click' : 'Start Click'}
              </Button>
              
              {!metronomeDataProducer?.id && (
                <p className="text-xs text-neutral-400 text-center">
                  Waiting for leader’s metronome stream…
                </p>
              )}

              {isLeader && (
                <div className="pt-3 border-t border-neutral-700 space-y-2">
                  <p className="text-sm text-center font-medium text-indigo-300">You are the leader</p>
                  <Button
                    onClick={() => startLeaderMetronome(120)}
                    className="bg-indigo-700 hover:bg-indigo-600"
                  >
                    Start Leader Metronome (120 BPM)
                  </Button>
                  <Button
                    onClick={stopLeaderMetronome}
                    className="bg-neutral-700 hover:bg-neutral-600"
                  >
                    Stop Leader Metronome
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* --------------------------------------------------- */}
          {/* Right Column: Streams (Mixer)                       */}
          {/* --------------------------------------------------- */}
          <div className="md:col-span-2 space-y-6">

            <Card title="Active Channels (Mixer)" icon={<IconSpeaker />} className={!isConnected ? 'pointer-events-none' : ''}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from(consumingProducers.entries()).map(
                  ([producerId, { consumer }]) => (
                    <RemoteAudio
                      key={producerId}
                      consumer={consumer}
                      outputDeviceId={selectedOutputId} // <-- Pass the selected output
                    />
                  )
                )}
                {consumingProducers.size === 0 && (
                  <p className="text-sm text-neutral-400 col-span-full">
                    No active channels. Listen to a jammer to add them here.
                  </p>
                )}
              </div>
            </Card>

            <Card title="Available Jammers" icon={<IconUser />} className={!isConnected ? 'pointer-events-none' : ''}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from(availableProducers.entries())
                  .filter(
                    ([producerId, meta]) =>
                      meta?.kind === 'audio' &&
                      !consumingProducers.has(producerId)
                  )
                  .map(([producerId, meta]) => (
                    <div
                      key={producerId}
                      className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between gap-4 border border-neutral-700"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-300">
                          New Jammer
                        </p>
                        <p className="text-xs font-mono text-neutral-400 break-all">
                          ({meta.ownerSocketId?.slice(0, 6)}…)
                        </p>
                      </div>
                      <button
                        onClick={() => handleConsume(producerId)}
                        disabled={!localStream}
                        className="flex-shrink-0 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-500 transition-all disabled:bg-neutral-600 disabled:cursor-not-allowed"
                      >
                        Start Listening
                      </button>
                    </div>
                  ))}
                
                {availableProducers.size === 0 && (
                  <p className="text-sm text-neutral-400 col-span-full">
                    Waiting for others to start jamming…
                  </p>
                )}
                
                {availableProducers.size > 0 && 
                 availableProducers.size === consumingProducers.size &&
                 Array.from(availableProducers.keys()).every(pid => consumingProducers.has(pid)) &&
                 (
                  <p className="text-sm text-neutral-400 col-span-full">
                    You are listening to all available jammers.
                  </p>
                 )
                }
              </div>
            </Card>

            <Card title="Participants" icon={<IconUser />} className={!isConnected ? 'pointer-events-none' : ''}>
              <ul className="space-y-2">
                {participantIds.map((socketId) => (
                  <li
                    key={socketId}
                    className="text-sm text-neutral-300 font-mono text-xs p-3 bg-neutral-800 rounded break-all"
                  >
                    {socketId}
                  </li>
                ))}
                {participantIds.length === 0 && (
                  <p className="text-sm text-neutral-400">
                    Just you for now!
                  </p>
                )}
              </ul>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}