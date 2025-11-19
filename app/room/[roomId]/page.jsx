'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { socketService } from '@/app/services/SocketService';
import { mediasoupService } from '@/app/services/MediasoupService';

// -----------------------------------------------------------------------------
// ICONS
// -----------------------------------------------------------------------------
const IconMic = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z" /></svg>);
const IconMicOff = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm-3.75 3a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75ZM12 15.75a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm.75 2.25a.75.75 0 0 0 1.5 0v-.75a.75.75 0 0 0-1.5 0v.75ZM12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Zm-3.938-6.528A4.5 4.5 0 0 0 6 12v1.5M18 12a4.486 4.486 0 0 0-3.062-4.028M18 13.5v-1.5a4.5 4.5 0 1 0-9 0v1.5m-3.062 4.028A4.486 4.486 0 0 1 6 12m6 9.75v-3.75M3.75 3.75l16.5 16.5" /></svg>);
const IconPlay = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L8.029 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" /></svg>);
const IconStop = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>);
const IconPlug = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l-4.24-4.24m5.83-5.83L15.17 11.42M12.75 5.1a.75.75 0 0 0-1.06 0l-4.24 4.24a.75.75 0 0 0 0 1.06l4.24 4.24a.75.75 0 0 0 1.06 0l4.24-4.24a.75.75 0 0 0 0-1.06l-4.24-4.24Z" /></svg>);
const IconPlugOff = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l-4.24-4.24m5.83-5.83L15.17 11.42M12.75 5.1a.75.75 0 0 0-1.06 0l-4.24 4.24a.75.75 0 0 0 0 1.06l4.24 4.24a.75.75 0 0 0 0-1.06l-4.24-4.24ZM3 3l18 18" /></svg>);
const IconUser = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>);
const IconMetronome = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v6m0 6v6m6-6h6m-6 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const IconSpeaker = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>);
const IconVideo = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>);
const IconVideoOff = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75h-7.5a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 4.5 5.25H9M18 18.75h-7.5a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 10.5 5.25H18M3 3l18 18" /></svg>);
const IconTerminal = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>);
const IconSettings = () => (<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" /></svg>);

// -----------------------------------------------------------------------------
// GLOBAL LOGGING (Visual Terminal)
// -----------------------------------------------------------------------------
let addLogEntry = () => {};

function internalLog(level, ...args) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  console.log(`[${level}]`, ...args);
  addLogEntry({ level, msg, ts: new Date().toISOString().split('T')[1].slice(0, -1) });
}

const LOG = (...args) => internalLog('INFO', ...args);
const WARN = (...args) => internalLog('WARN', ...args);
const ERR = (...args) => internalLog('ERROR', ...args);

// -----------------------------------------------------------------------------
// UI COMPONENTS
// -----------------------------------------------------------------------------
function RemoteAudio({ consumer, outputDeviceId }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    const track = consumer?.track;
    if (!el || !track) return;
    el.srcObject = new MediaStream([track]);
    if (outputDeviceId && typeof el.setSinkId === 'function') {
      el.setSinkId(outputDeviceId).catch(e => ERR('setSinkId failed', e));
    }
  }, [consumer, outputDeviceId]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

function RemoteVideo({ consumer }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    const track = consumer?.track;
    if (el && track) el.srcObject = new MediaStream([track]);
  }, [consumer]);
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
}

const SettingsCheckbox = ({ label, description, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-3 p-3 rounded-lg transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800 cursor-pointer'}`}>
    <input type="checkbox" className="w-5 h-5 rounded-md bg-neutral-700 border-neutral-600 text-indigo-500 focus:ring-indigo-500 focus:ring-2" checked={checked} onChange={onChange} disabled={disabled} />
    <div><p className="text-sm font-medium text-neutral-200">{label}</p><p className="text-xs text-neutral-400">{description}</p></div>
  </label>
);

const SettingsSelect = ({ label, value, onChange, disabled, children }) => (
  <div className="p-3">
    <label className="block text-sm font-medium text-neutral-200 mb-1">{label}</label>
    <select value={value} onChange={onChange} disabled={disabled} className="w-full bg-neutral-700 border border-neutral-600 text-neutral-200 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">{children}</select>
  </div>
);

const Card = ({ title, icon, children, className = '' }) => (
  <div className={`bg-neutral-900 border border-neutral-800 p-5 rounded-lg shadow-lg ${className}`}>
    <h2 className="text-xl font-semibold mb-4 border-b border-neutral-700 pb-3 flex items-center gap-2 text-indigo-400">{icon}{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const Button = ({ onClick, disabled, children, className = '', icon }) => (
  <button onClick={onClick} disabled={disabled} className={`w-full px-4 py-2.5 font-medium text-white rounded-md shadow-sm transition-all flex items-center justify-center gap-2 ${className} ${disabled ? 'bg-neutral-600 cursor-not-allowed' : 'hover:brightness-110'}`}>
    {icon}<span>{children}</span>
  </button>
);

function LogTerminal({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  return (
    <div className="bg-black border border-neutral-800 rounded-lg font-mono text-xs h-64 flex flex-col shadow-2xl">
      <div className="bg-neutral-800 px-4 py-2 flex items-center gap-2 border-b border-neutral-700">
        <IconTerminal /> <span className="font-bold text-neutral-300">System Logs & Metrics</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.length === 0 && <span className="text-neutral-600 italic">Waiting for events...</span>}
        {logs.map((l, i) => (
          <div key={i} className="break-all">
            <span className="text-neutral-500">[{l.ts}]</span>{' '}
            <span className={l.level === 'ERROR' ? 'text-red-400 font-bold' : l.level === 'WARN' ? 'text-yellow-400' : 'text-green-400'}>{l.level}:</span>{' '}
            <span className="text-neutral-300">{l.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PAGE COMPONENT
// -----------------------------------------------------------------------------

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomid || params.roomId;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [participantIds, setParticipantIds] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // State: Media
  const [producersBySocketId, setProducersBySocketId] = useState(new Map());
  const [consumersBySocketId, setConsumersBySocketId] = useState(new Map());
  const [localAudioStream, setLocalAudioStream] = useState(null);
  const [myAudioProducer, setMyAudioProducer] = useState(null);
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [myVideoProducer, setMyVideoProducer] = useState(null);

  // State: Metronome
  const [metronomeLeaderSocketId, setMetronomeLeaderSocketId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [metronomeDataProducer, setMetronomeDataProducer] = useState(null);
  const [isMetronomeConsuming, setIsMetronomeConsuming] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);

  // State: Settings
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const [echoCancellation, setEchoCancellation] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const [autoGainControl, setAutoGainControl] = useState(false);
  const [audioSampleRate, setAudioSampleRate] = useState('48000');
  const [audioLatency, setAudioLatency] = useState('0');
  const [opusStereo, setOpusStereo] = useState(true);
  const [opusDtx, setOpusDtx] = useState(false);
  const [opusFec, setOpusFec] = useState(false);
  
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoInputId, setSelectedVideoInputId] = useState('');
  const [videoResolution, setVideoResolution] = useState('360p');
  const [videoFramerate, setVideoFramerate] = useState('15');
  const [receiverPlayoutDelay, setReceiverPlayoutDelay] = useState(0);

  // Refs
  const audioContextRef = useRef(null);
  const clickBufferRef = useRef(null);
  const metronomeStateRef = useRef({ isEnabled: false });
  const metronomeSenderRef = useRef({ dp: null, interval: null });
  const firstUnmountRef = useRef(false);

  // Bind global log
  useEffect(() => {
    addLogEntry = (log) => setLogs(prev => [...prev.slice(-99), log]);
  }, []);

  // Mount Logic
  useEffect(() => {
    LOG('Initializing Room:', roomId);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;

    (async () => {
      try {
        const res = await fetch('/click.mp3');
        const buf = await res.arrayBuffer();
        clickBufferRef.current = await ctx.decodeAudioData(buf);
        LOG('Click sample loaded.');
      } catch (e) { ERR('Failed to load /click.mp3', e); }
    })();

    const onBeforeUnload = () => socketService.disconnect();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      if (process.env.NODE_ENV !== 'production' && !firstUnmountRef.current) {
        firstUnmountRef.current = true;
        window.removeEventListener('beforeunload', onBeforeUnload);
        return;
      }
      window.removeEventListener('beforeunload', onBeforeUnload);
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ---------------------------------------------------------------------------
  // STATS & LATENCY
  // ---------------------------------------------------------------------------
  const checkLatencyStats = async () => {
    LOG('--- CHECKING LATENCY ---');
    if (consumersBySocketId.size === 0) {
      LOG('No active audio streams to measure.');
      return;
    }

    for (const [socketId, consumers] of consumersBySocketId.entries()) {
      if (consumers.audio) {
        try {
          const stats = await mediasoupService.getConsumerStats(consumers.audio.id);
          let reportFound = false;
          stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
              reportFound = true;
              // NOTE: jitterBufferDelay is in seconds, total accumulated. 
              // Modern browsers may expose 'jitterBufferDelay' as total seconds.
              // To get average, we divide by emitted count, or just report the packet loss and RTT if available.
              
              const lost = report.packetsLost || 0;
              const frames = report.framesDecoded || 0;
              
              // Round Trip Time is usually on candidate-pair or remote-inbound-rtp, but sometimes exposed here.
              // We will look for associated remote-inbound-rtp or just log what we have.
              LOG(`[AUDIO FROM ${socketId.slice(0,5)}] PktsLost: ${lost} | Frames: ${frames} | JitterBuffer: ${(report.jitterBufferDelay || 0).toFixed(3)}s`);
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              LOG(`[NET] RTT: ${(report.currentRoundTripTime * 1000).toFixed(1)}ms`);
            }
          });
          if (!reportFound) LOG(`[${socketId}] No inbound-rtp stats found.`);
        } catch (e) { ERR('Stats error:', e); }
      }
    }
    LOG('------------------------');
  };

  // ---------------------------------------------------------------------------
  // METRONOME
  // ---------------------------------------------------------------------------
  const playClick = () => {
    if (audioContextRef.current && clickBufferRef.current) {
      if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume().catch(() => {});
      const src = audioContextRef.current.createBufferSource();
      src.buffer = clickBufferRef.current;
      src.connect(audioContextRef.current.destination);
      src.start(0);
    }
  };

  // Leader Logic
  const startLeaderMetronome = async (bpm) => {
    if (!isLeader) return;
    
    // 1. Enable local playback
    setIsMetronomeEnabled(true);
    metronomeStateRef.current.isEnabled = true;
    if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

    // 2. Create Producer
    const dp = await mediasoupService.createDataProducer({ label: 'metronome' });
    metronomeSenderRef.current.dp = dp;
    setMetronomeDataProducer({ id: dp.id, label: 'metronome', ownerSocketId: socketService.socket.id });

    // 3. Start interval: Play LOCAL, Send REMOTE
    const intervalMs = 60000 / bpm;
    LOG(`Starting Leader Metronome @ ${bpm} BPM (${intervalMs.toFixed(0)}ms)`);
    
    metronomeSenderRef.current.interval = setInterval(() => {
      if (metronomeStateRef.current.isEnabled) {
        // Play Locally
        playClick();
        // Send Remote
        if (dp.readyState === 'open') {
          dp.send(JSON.stringify({ type: 'tick', ts: Date.now() }));
        }
      }
    }, intervalMs);
  };

  const stopLeaderMetronome = () => {
    LOG('Stopping Leader Metronome');
    setIsMetronomeEnabled(false);
    metronomeStateRef.current.isEnabled = false;
    clearInterval(metronomeSenderRef.current.interval);
    metronomeSenderRef.current.dp?.close();
    setMetronomeDataProducer(null);
    setIsMetronomeConsuming(false);
  };

  // Follower Logic
  const subscribeMetronomeIfReady = async () => {
    if (!metronomeDataProducer?.id || isMetronomeConsuming || isLeader) return;
    
    LOG('Subscribing to metronome...');
    await mediasoupService.consumeData(metronomeDataProducer.id, (msg) => {
       if (msg?.type === 'tick' && metronomeStateRef.current.isEnabled) {
         playClick();
       }
    });
    setIsMetronomeConsuming(true);
  };

  // Toggle (Mute/Unmute)
  const handleToggleMetronome = async () => {
    const next = !isMetronomeEnabled;
    setIsMetronomeEnabled(next);
    metronomeStateRef.current.isEnabled = next;
    if (next && audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
    
    // Only followers need to subscribe. Leaders are already running the interval.
    if (next && !isLeader) await subscribeMetronomeIfReady();
  };

  // Effects for Metronome
  useEffect(() => {
    if (isMetronomeEnabled && !isLeader) subscribeMetronomeIfReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetronomeEnabled, metronomeDataProducer, isLeader]);

  // ---------------------------------------------------------------------------
  // SOCKET EVENTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const off1 = socketService.onParticipantJoined(({ socketId }) => {
      LOG('Participant joined:', socketId);
      setParticipantIds(prev => [...prev, socketId]);
    });
    const off2 = socketService.onParticipantLeft(({ socketId }) => {
      LOG('Participant left:', socketId);
      setParticipantIds(prev => prev.filter(id => id !== socketId));
      setProducersBySocketId(prev => { const n = new Map(prev); n.delete(socketId); return n; });
      setConsumersBySocketId(prev => { const n = new Map(prev); n.delete(socketId); return n; });
    });
    const off3 = socketService.onMediaProducerCreated(({ producerId, kind, ownerSocketId }) => {
      LOG('Producer available:', kind, 'from', ownerSocketId);
      setProducersBySocketId(prev => {
        const n = new Map(prev);
        const u = n.get(ownerSocketId) || {};
        if (kind === 'audio') u.audio = { producerId, kind, ownerSocketId };
        if (kind === 'video') u.video = { producerId, kind, ownerSocketId };
        n.set(ownerSocketId, u);
        return n;
      });
    });
    const off4 = socketService.onMediaProducerClosed(({ producerId }) => {
      setProducersBySocketId(prev => {
        const n = new Map(prev);
        for (const [sid, u] of n.entries()) {
          if (u.audio?.producerId === producerId) u.audio = undefined;
          if (u.video?.producerId === producerId) u.video = undefined;
        }
        return n;
      });
    });
    const off5 = socketService.onDataProducerCreated(({ dataProducerId, label, ownerSocketId }) => {
      if (label === 'metronome' && ownerSocketId === metronomeLeaderSocketId) {
        setMetronomeDataProducer({ id: dataProducerId, label, ownerSocketId });
      }
    });
    const off6 = socketService.on('newMetronomeLeader', ({ leaderSocketId }) => {
      LOG('New Metronome Leader:', leaderSocketId);
      setMetronomeLeaderSocketId(leaderSocketId);
      const amLeader = !!leaderSocketId && leaderSocketId === socketService.socket?.id;
      setIsLeader(amLeader);
      setIsMetronomeConsuming(false);
      if (!amLeader) setMetronomeDataProducer(null);
    });
    const off7 = socketService.on('dataProducerClosed', ({ dataProducerId }) => {
      if (metronomeDataProducer?.id === dataProducerId) {
        setMetronomeDataProducer(null);
        setIsMetronomeConsuming(false);
      }
    });
    return () => { off1(); off2(); off3(); off4(); off5(); off6(); off7(); };
  }, [metronomeLeaderSocketId, metronomeDataProducer?.id]);

  // ---------------------------------------------------------------------------
  // DEVICE UPDATES
  // ---------------------------------------------------------------------------
  const handleGetAudio = async () => {
    if (inputDevices.length === 0) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devs = await navigator.mediaDevices.enumerateDevices();
        setInputDevices(devs.filter(d => d.kind === 'audioinput'));
        setOutputDevices(devs.filter(d => d.kind === 'audiooutput'));
        if(!selectedInputId) setSelectedInputId(devs.find(d => d.kind === 'audioinput')?.deviceId);
      } catch(e) { ERR(e.message); }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
          echoCancellation, noiseSuppression, autoGainControl,
          sampleRate: { ideal: parseInt(audioSampleRate) },
          latency: parseFloat(audioLatency)
        }
      });
      setLocalAudioStream(stream);
      LOG('Mic acquired.');
    } catch(e) { ERR('Mic error:', e.message); }
  };

  const handleGetVideo = async () => {
    if (videoDevices.length === 0) {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devs = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devs.filter(d => d.kind === 'videoinput'));
        if(!selectedVideoInputId) setSelectedVideoInputId(devs.find(d => d.kind === 'videoinput')?.deviceId);
      } catch(e) { ERR(e.message); }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideoInputId ? { exact: selectedVideoInputId } : undefined,
          width: { ideal: videoResolution === '1080p' ? 1920 : (videoResolution === '720p' ? 1280 : 640) },
          frameRate: { ideal: parseInt(videoFramerate) }
        }
      });
      setLocalVideoStream(stream);
      LOG('Cam acquired.');
    } catch(e) { ERR('Cam error:', e.message); }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-4 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-white">Jam Room <span className="text-indigo-500">Beta</span></h1>
            <p className="text-neutral-500 font-mono text-xs mt-1">ID: {roomId}</p>
            <div className={`mt-4 inline-flex items-center gap-2 py-1 px-3 rounded-full border text-xs font-mono ${isConnected ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-red-900/30 border-red-800 text-red-400'}`}>
              {isConnected ? <IconPlug /> : <IconPlugOff />} {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </header>

          <Card title="Connection" icon={<IconPlug />}>
            <Button onClick={() => {
              if(isConnected) return;
              socketService.connect(process.env.NEXT_PUBLIC_SIGNAL_URL || 'http://localhost:4000', () => {
                socketService.joinRoom(roomId, async (reply) => {
                  if (reply.error) { ERR(reply.error); return; }
                  const { routerRtpCapabilities, existingProducers, existingDataProducers, otherParticipantIds, metronomeLeaderSocketId: lId } = reply;
                  setParticipantIds(otherParticipantIds);
                  await mediasoupService.loadDevice(routerRtpCapabilities);
                  await mediasoupService.createRecvTransport();
                  
                  const seeded = new Map();
                  existingProducers.forEach(p => {
                    const u = seeded.get(p.ownerSocketId) || {};
                    if (p.kind === 'audio') u.audio = p;
                    if (p.kind === 'video') u.video = p;
                    seeded.set(p.ownerSocketId, u);
                  });
                  setProducersBySocketId(seeded);

                  setMetronomeLeaderSocketId(lId);
                  setIsLeader(!!lId && lId === socketService.socket?.id);
                  const metro = existingDataProducers.find(d => d.label === 'metronome' && d.ownerSocketId === lId);
                  if (metro) setMetronomeDataProducer({ id: metro.dataProducerId, label: metro.label, ownerSocketId: metro.ownerSocketId });

                  setIsConnected(true);
                  LOG('Joined room.');
                });
              });
            }} disabled={isConnected} className={isConnected ? 'bg-green-800' : 'bg-indigo-600 hover:bg-indigo-500'}>
              {isConnected ? 'Joined Room' : 'Connect to Room'}
            </Button>
          </Card>

          <LogTerminal logs={logs} />
          <div className="grid grid-cols-1 gap-2">
            <button onClick={checkLatencyStats} className="bg-neutral-800 hover:bg-neutral-700 text-xs py-2 rounded border border-neutral-700 text-neutral-300 w-full font-mono">
              Measure Latency (RTT/Jitter)
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card title="Receiver (Latency)" icon={<IconSettings />}>
            <div className="p-3">
              <label className="block text-sm font-medium text-neutral-200 mb-2">Receiver Jitter Buffer</label>
              <div className="flex items-center gap-4">
                <input type="range" min="0" max="0.5" step="0.005" value={receiverPlayoutDelay} onChange={e => {
                  const v = parseFloat(e.target.value);
                  setReceiverPlayoutDelay(v);
                  consumersBySocketId.forEach(c => c.audio && mediasoupService.setConsumerPlayoutDelay(c.audio.id, v));
                }} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <span className="font-mono text-xs bg-neutral-800 px-2 py-1 rounded text-indigo-300 w-16 text-center">{receiverPlayoutDelay}s</span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">0s = Real-time (may click). 0.02s = Safe.</p>
            </div>
          </Card>

          <Card title="Microphone" icon={<IconMic />} className={!isConnected ? 'opacity-50 pointer-events-none' : ''}>
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-2">
                 <Button onClick={handleGetAudio} disabled={!!localAudioStream} className="bg-blue-700 hover:bg-blue-600 text-xs" icon={<IconMicOff />}>Init Mic</Button>
                 {!myAudioProducer ? 
                   <Button onClick={async () => {
                     if(!localAudioStream) return;
                     try {
                       await mediasoupService.createSendTransport();
                       const t = localAudioStream.getAudioTracks()[0];
                       const p = await mediasoupService.produce(t, { opusStereo, opusDtx, opusFec });
                       setMyAudioProducer(p);
                       LOG('Producing Audio.');
                     } catch(e) { ERR(e.message); }
                   }} disabled={!localAudioStream} className="bg-green-700 hover:bg-green-600 text-xs" icon={<IconPlay />}>On Air</Button> :
                   <Button onClick={() => { myAudioProducer?.close(); setMyAudioProducer(null); localAudioStream?.getTracks().forEach(t=>t.stop()); setLocalAudioStream(null); LOG('Audio Stopped'); }} className="bg-red-700 hover:bg-red-600 text-xs" icon={<IconStop />}>Off Air</Button>
                 }
               </div>
               
               <SettingsSelect label="Device" value={selectedInputId} onChange={e=>setSelectedInputId(e.target.value)} disabled={!!localAudioStream}>{inputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</SettingsSelect>
               
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-neutral-800 p-2 rounded border border-neutral-700 space-y-1">
                   <p className="text-[10px] font-bold text-neutral-500 uppercase">DSP</p>
                   <SettingsCheckbox label="Echo Canc." checked={echoCancellation} onChange={e=>setEchoCancellation(e.target.checked)} disabled={!!localAudioStream} />
                   <SettingsCheckbox label="Noise Supp." checked={noiseSuppression} onChange={e=>setNoiseSuppression(e.target.checked)} disabled={!!localAudioStream} />
                 </div>
                 <div className="bg-neutral-800 p-2 rounded border border-neutral-700 space-y-1">
                   <p className="text-[10px] font-bold text-neutral-500 uppercase">Codec</p>
                   <SettingsCheckbox label="Stereo" checked={opusStereo} onChange={e=>setOpusStereo(e.target.checked)} disabled={!!myAudioProducer} />
                   <SettingsCheckbox label="FEC" checked={opusFec} onChange={e=>setOpusFec(e.target.checked)} disabled={!!myAudioProducer} />
                 </div>
               </div>
             </div>
          </Card>

          <Card title="Webcam" icon={<IconVideo />} className={!isConnected ? 'opacity-50 pointer-events-none' : ''}>
            <div className="space-y-4">
               <div className="aspect-video bg-neutral-800 rounded overflow-hidden">
                 {localVideoStream && <video ref={el=>{if(el)el.srcObject=localVideoStream}} autoPlay playsInline muted className="w-full h-full object-cover" />}
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <Button onClick={handleGetVideo} disabled={!!localVideoStream} className="bg-blue-700 hover:bg-blue-600 text-xs" icon={<IconVideoOff />}>Init Cam</Button>
                 {!myVideoProducer ? 
                    <Button onClick={async () => {
                       if(!localVideoStream) return;
                       try {
                         await mediasoupService.createSendTransport();
                         const t = localVideoStream.getVideoTracks()[0];
                         const p = await mediasoupService.produce(t, {}, { 
                           height: { ideal: videoResolution === '1080p' ? 1920 : (videoResolution === '720p' ? 1280 : 640) },
                           frameRate: { ideal: parseInt(videoFramerate) }
                         });
                         setMyVideoProducer(p);
                         LOG('Producing Video');
                       } catch(e) { ERR(e.message); }
                    }} disabled={!localVideoStream} className="bg-green-700 hover:bg-green-600 text-xs" icon={<IconPlay />}>On Air</Button> :
                    <Button onClick={() => { myVideoProducer?.close(); setMyVideoProducer(null); localVideoStream?.getTracks().forEach(t=>t.stop()); setLocalVideoStream(null); }} className="bg-red-700 hover:bg-red-600 text-xs" icon={<IconStop />}>Off Air</Button>
                 }
               </div>
               <SettingsSelect label="Resolution" value={videoResolution} onChange={e=>setVideoResolution(e.target.value)} disabled={!!localVideoStream}>
                 <option value="360p">360p (Performance)</option>
                 <option value="720p">720p (HD)</option>
               </SettingsSelect>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <Card title="Metronome" icon={<IconMetronome />} className={!isConnected ? 'opacity-50 pointer-events-none' : ''}>
             <Button onClick={handleToggleMetronome} disabled={!metronomeLeaderSocketId} className={isMetronomeEnabled ? 'bg-red-700 hover:bg-red-600' : 'bg-neutral-700 hover:bg-neutral-600'}>
                {isMetronomeEnabled ? 'Mute Click' : 'Unmute Click'}
             </Button>
             {isLeader && (
               <div className="mt-2 pt-2 border-t border-neutral-700 flex gap-2">
                 <Button onClick={() => startLeaderMetronome(120)} className="bg-indigo-700 text-xs">Start 120</Button>
                 <Button onClick={stopLeaderMetronome} className="bg-neutral-700 text-xs">Stop</Button>
               </div>
             )}
             {!isLeader && metronomeLeaderSocketId && (
                <p className="text-xs text-center mt-2 text-neutral-400">Follower Mode</p>
             )}
          </Card>

           <Card title="Session Mix" icon={<IconSpeaker />} className={!isConnected ? 'opacity-50 pointer-events-none' : ''}>
             {Array.from(consumersBySocketId.entries()).map(([sid, consumers]) => (
               <div key={sid} className="bg-neutral-800 p-3 rounded border border-neutral-700 mb-2">
                 <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2"><IconUser /><span className="text-sm font-mono">{sid.slice(0,5)}</span></div>
                   <div className="text-xs text-green-400">Streaming</div>
                 </div>
                 {consumers.video && <div className="aspect-video bg-black rounded overflow-hidden mb-2"><RemoteVideo consumer={consumers.video} /></div>}
                 <RemoteAudio consumer={consumers.audio} outputDeviceId={selectedOutputId} />
               </div>
             ))}
             {Array.from(producersBySocketId.entries()).filter(([sid]) => !consumersBySocketId.has(sid)).map(([sid, p]) => (
                <div key={sid} className="bg-neutral-800 p-3 rounded border border-neutral-700 mb-2 flex justify-between items-center opacity-75">
                   <div className="flex items-center gap-2"><IconUser /><span className="text-sm font-mono">{sid.slice(0,5)}</span></div>
                   <Button onClick={async () => {
                      const cs = {};
                      if(p.audio) { 
                         const c = await mediasoupService.consume(p.audio.producerId); 
                         mediasoupService.setConsumerPlayoutDelay(c.id, receiverPlayoutDelay); 
                         cs.audio = c; 
                      }
                      if(p.video) cs.video = await mediasoupService.consume(p.video.producerId);
                      setConsumersBySocketId(prev => { const n = new Map(prev); n.set(sid, cs); return n; });
                   }} className="w-auto text-xs bg-green-700 py-1 px-3">Connect</Button>
                </div>
             ))}
             {producersBySocketId.size === 0 && consumersBySocketId.size === 0 && <p className="text-neutral-500 italic text-sm text-center py-4">Room is empty.</p>}
           </Card>
        </div>
      </div>
    </div>
  );
}