'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socketService } from '@/app/services/SocketService';
import { mediasoupService } from '@/app/services/MediasoupService';

// -----------------------------------------------------------------------------
// ASSETS & CONFIG
// -----------------------------------------------------------------------------
const ROLE_DEFINITIONS = {
  DRUMMER: { icon: '🥁', label: 'Drummer', priority: 0 },
  BASSIST: { icon: '🎸', label: 'Bassist', priority: 1 },
  RHYTHM_GUITAR: { icon: 'thm', label: 'Rhythm Gtr', priority: 2 },
  LEAD_GUITAR: { icon: '🤘', label: 'Lead Gtr', priority: 3 },
  KEYS: { icon: '🎹', label: 'Keys', priority: 2 },
  VOCALS: { icon: '🎤', label: 'Vocals', priority: 3 },
  SPECTATOR: { icon: '👀', label: 'Spectator', priority: 99 },
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------
const Button = ({ children, onClick, disabled, className = '', variant = 'primary' }) => {
  const base = "px-4 py-2 rounded font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    secondary: "bg-neutral-700 hover:bg-neutral-600 text-neutral-200",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white"
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

const UserCard = ({ participant, isMe, latencyStats }) => {
  const roleDef = ROLE_DEFINITIONS[participant.role] || ROLE_DEFINITIONS.SPECTATOR;
  
  return (
    <div className={`relative p-3 rounded-lg border ${isMe ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-neutral-800 border-neutral-700'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={participant.role}>{roleDef.icon}</span>
          <div>
            <p className="font-bold text-sm text-white leading-tight">
              {participant.displayName || participant.socketId.slice(0, 5)} 
              {isMe && <span className="text-indigo-400 ml-1">(You)</span>}
            </p>
            <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{roleDef.label}</p>
          </div>
        </div>
        {participant.isLeader && (
          <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded border border-yellow-500/50 font-bold">LEADER</span>
        )}
      </div>

      {/* Latency Stats Overlay */}
      {!isMe && latencyStats && (
        <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-mono text-neutral-500 bg-black/20 p-1.5 rounded">
          <div>RTT: <span className={latencyStats.rtt > 100 ? 'text-red-400' : 'text-green-400'}>{latencyStats.rtt}ms</span></div>
          <div>Jitter: {latencyStats.jitter}ms</div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;

  // -- APP STATE --
  const [step, setStep] = useState('lobby'); // lobby | room
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState('SPECTATOR');
  
  // -- ROOM STATE --
  const [participants, setParticipants] = useState([]);
  const [latencyMatrix, setLatencyMatrix] = useState({});
  const [metronomeState, setMetronomeState] = useState({ isPlaying: false, tempo: 120, beatsPerMeasure: 4 });
  const [mySyncOffset, setMySyncOffset] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0); // diff between local Date.now() and server time
  
  // -- MEDIA STATE --
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [activeProducers, setActiveProducers] = useState({ audio: null, video: null });
  const [remoteConsumers, setRemoteConsumers] = useState(new Map());

  // -- REFS --
  const audioCtx = useRef(null);
  const clickBuffer = useRef(null);
  const schedulerRef = useRef(null);
  const nextNoteTime = useRef(0);
  const beatCount = useRef(0);
  const socketRef = useRef(null); // Keep a ref for the interval loops
  
  // ---------------------------------------------------------------------------
  // 1. INITIALIZATION & CLEANUP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Load click sound
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    
    fetch('/click.mp3')
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { clickBuffer.current = decoded; })
      .catch(err => console.error("Failed to load click", err));

    // Get Devices
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setDevices({
        inputs: devs.filter(d => d.kind === 'audioinput'),
        outputs: devs.filter(d => d.kind === 'audiooutput')
      });
    });

    return () => {
      socketService.disconnect();
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      if (audioCtx.current) audioCtx.current.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. SOCKET EVENT HANDLERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleEvents = () => {
      // -- Room Events --
      socketService.on('participantJoined', (p) => {
        setParticipants(prev => {
          if (prev.find(x => x.socketId === p.socketId)) return prev;
          return [...prev, { ...p, isLeader: false }]; // Defaults
        });
      });

      socketService.on('participantLeft', ({ socketId }) => {
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
        setLatencyMatrix(prev => {
          const next = { ...prev };
          delete next[socketId];
          return next;
        });
      });

      socketService.on('leaderChanged', ({ newLeaderId }) => {
        setParticipants(prev => prev.map(p => ({
          ...p,
          isLeader: p.socketId === newLeaderId
        })));
      });

      // -- Sync & Latency Events --
      socketService.on('peerPing', ({ fromSocketId, pingId, t0 }) => {
        // Automatically Pong back
        socketService.pongPeer(fromSocketId, pingId, t0);
      });

      socketService.on('peerPong', ({ fromSocketId, pingId, t0, t1 }) => {
        const t2 = Date.now(); // We received pong
        const rtt = t2 - t0;
        // Report to server for matrix
        socketService.recordLatency(fromSocketId, rtt);
      });

      // -- Metronome Events --
      socketService.on('metronomeSync', (state) => {
        // State includes: isPlaying, tempo, beatsPerMeasure, syncOffset, serverTime
        setMetronomeState(prev => ({ ...prev, ...state }));
        if (state.syncOffset !== undefined) setMySyncOffset(state.syncOffset);
        
        // If playing started, align local engine
        if (state.isPlaying && !metronomeState.isPlaying) {
          startScheduler(state.tempo);
        } else if (!state.isPlaying) {
          stopScheduler();
        }
      });

      socketService.on('beatSync', ({ beatNumber, leaderTimestamp, syncOffset }) => {
        // Visual or audible correction could happen here
        // Ideally, we schedule the click in the WebAudio graph based on this
      });
    };

    // Register generic handlers
    handleEvents();

    // -- Background Loops (Only active when joined) --
    let syncInterval;
    let latencyInterval;

    if (step === 'room') {
      // A. Clock Sync Loop (Every 10s)
      const syncClock = () => {
        const t0 = Date.now();
        socketService.syncTime({ t0 }, (res) => {
          const t3 = Date.now();
          const rtt = t3 - t0;
          const serverTime = res.t1 + (rtt / 2);
          const offset = serverTime - t3;
          setServerTimeOffset(offset);
        });
      };
      
      // B. Latency Matrix Loop (Every 2s)
      const measureLatency = () => {
        participants.forEach(p => {
          if (p.socketId === socketService.socket.id) return;
          const pingId = Math.random().toString(36).substr(2, 5);
          socketService.pingPeer(p.socketId, pingId, Date.now(), () => {});
        });
        
        // Refresh Matrix from server
        socketService.emit('getLatencyMatrix', null, (res) => {
          if (res?.matrix) setLatencyMatrix(res.matrix);
        });
      };

      syncClock();
      syncInterval = setInterval(syncClock, 10000);
      latencyInterval = setInterval(measureLatency, 2000);
    }

    return () => {
      clearInterval(syncInterval);
      clearInterval(latencyInterval);
    };
  }, [step, participants, metronomeState.isPlaying]);


  // ---------------------------------------------------------------------------
  // 3. JOIN LOGIC
  // ---------------------------------------------------------------------------
  const handleJoin = () => {
    if (!displayName) return alert("Please enter a name");
    
    socketService.connect(process.env.NEXT_PUBLIC_SIGNAL_URL || 'http://localhost:4000', () => {
      socketService.joinRoom({ roomId, role: selectedRole, displayName }, async (res) => {
        if (res.error) return alert(res.error);

        // 1. Initialize Mediasoup
        await mediasoupService.loadDevice(res.rtpCapabilities);
        await mediasoupService.createRecvTransport(); // Prepare to receive

        // 2. Set State
        setParticipants(res.participants.map(p => ({
          ...p,
          isLeader: res.isLeader && p.socketId === socketService.socket.id || p.socketId === res.metronome.leaderId
        })));
        setMetronomeState(res.metronome);
        if (res.syncTargets) console.log("Syncing to:", res.syncTargets);
        
        // 3. Move to Room
        setStep('room');
        
        // 4. Consume existing producers
        res.existingProducers.forEach(async (p) => {
          const consumer = await mediasoupService.consume(p.id);
          setRemoteConsumers(prev => new Map(prev).set(p.ownerId, consumer));
        });
      });
    });
  };

  // ---------------------------------------------------------------------------
  // 4. AUDIO ENGINE
  // ---------------------------------------------------------------------------
  const toggleAudio = async () => {
    if (activeProducers.audio) {
      activeProducers.audio.close();
      socketService.closeProducer(activeProducers.audio.id);
      setActiveProducers(p => ({ ...p, audio: null }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: false, 
            autoGainControl: false,
            latency: 0
          } 
        });
        const track = stream.getAudioTracks()[0];
        await mediasoupService.createSendTransport();
        const producer = await mediasoupService.produce(track);
        setActiveProducers(p => ({ ...p, audio: producer }));
      } catch (err) {
        console.error("Mic Error", err);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 5. METRONOME SCHEDULER (WebAudio)
  // ---------------------------------------------------------------------------
  const startScheduler = (tempo) => {
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    nextNoteTime.current = audioCtx.current.currentTime + 0.1;
    scheduler();
  };

  const stopScheduler = () => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
  };

  const scheduler = () => {
    const tempo = metronomeState.tempo || 120;
    const secondsPerBeat = 60.0 / tempo;
    const scheduleAheadTime = 0.1; 

    while (nextNoteTime.current < audioCtx.current.currentTime + scheduleAheadTime) {
      scheduleNote(nextNoteTime.current);
      nextNoteTime.current += secondsPerBeat;
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  };

  const scheduleNote = (time) => {
    if (!clickBuffer.current) return;
    
    // -- COMPENSATION LOGIC --
    // If we are a follower, we might delay this click by `mySyncOffset` 
    // to align with what the server expects.
    // NOTE: This is a simplified implementation. True cascading sync 
    // requires delaying the *input* stream, not just the click. 
    // But hearing the click at the "right" time is step 1.
    const playTime = time; // + (mySyncOffset / 1000); 

    const osc = audioCtx.current.createBufferSource();
    osc.buffer = clickBuffer.current;
    osc.connect(audioCtx.current.destination);
    osc.start(playTime);

    // If Leader, announce beat
    if (participants.find(p => p.socketId === socketService.socket.id)?.isLeader) {
       // Ideally send this via DataChannel for low latency
       // socketService.announceBeat(...) // Using socket for now as per backend
    }
  };

  const toggleMetronome = () => {
    const newState = !metronomeState.isPlaying;
    socketService.updateMetronome({ isPlaying: newState }, (res) => {
      if (!res.error) setMetronomeState(res.state);
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER: LOBBY
  // ---------------------------------------------------------------------------
  if (step === 'lobby') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">Join Jam Session</h1>
          <p className="text-neutral-400 mb-6">Configure your musician profile</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Display Name</label>
              <input 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:border-indigo-500 outline-none" 
                placeholder="Ex. John Bonham" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                  <button 
                    key={key}
                    onClick={() => setSelectedRole(key)}
                    className={`p-3 rounded-lg border text-left transition-all ${selectedRole === key ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'}`}
                  >
                    <div className="text-xl">{def.icon}</div>
                    <div className="text-xs font-bold mt-1">{def.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleJoin} className="w-full py-4 text-lg mt-4">
              Enter Studio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: ROOM
  // ---------------------------------------------------------------------------
  const amILeader = participants.find(p => p.socketId === socketService.socket.id)?.isLeader;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 font-sans">
      <header className="flex justify-between items-center max-w-6xl mx-auto mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-indigo-500">⚡</span> Live Jam
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 mt-1">
            <span>Sync Offset: {mySyncOffset}ms</span>
            <span>Clock Skew: {Math.round(serverTimeOffset)}ms</span>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={toggleAudio} variant={activeProducers.audio ? "danger" : "primary"}>
             {activeProducers.audio ? "Mute Mic" : "Unmute Mic"}
           </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COL: METRONOME & CONTROLS */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xs font-bold text-neutral-500 uppercase mb-4 flex items-center gap-2">
              Master Metronome {amILeader && <span className="text-indigo-500">(You Control)</span>}
            </h2>
            
            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white font-mono">{metronomeState.tempo}</div>
                <div className="text-[10px] text-neutral-500 uppercase">BPM</div>
              </div>
              <div className={`w-4 h-4 rounded-full ${metronomeState.isPlaying ? 'animate-pulse bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-neutral-700'}`}></div>
            </div>

            {amILeader ? (
              <div className="space-y-2">
                 <input 
                   type="range" min="60" max="200" 
                   value={metronomeState.tempo} 
                   onChange={e => socketService.updateMetronome({ tempo: parseInt(e.target.value) })}
                   className="w-full accent-indigo-500 bg-neutral-800 h-2 rounded-lg appearance-none"
                 />
                 <Button onClick={toggleMetronome} className="w-full" variant={metronomeState.isPlaying ? 'secondary' : 'success'}>
                   {metronomeState.isPlaying ? 'Stop' : 'Start'}
                 </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-neutral-500 bg-black/20 p-2 rounded">
                Follow the leader for timing.
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COL: PARTICIPANTS */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-neutral-500 uppercase">Musicians ({participants.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Me */}
            <UserCard 
              participant={{ 
                displayName, 
                role: selectedRole, 
                isLeader: amILeader,
                socketId: socketService.socket?.id 
              }} 
              isMe={true} 
            />
            {/* Others */}
            {participants.filter(p => p.socketId !== socketService.socket.id).map(p => (
              <UserCard 
                key={p.socketId} 
                participant={p} 
                latencyStats={latencyMatrix[socketService.socket.id]?.[p.socketId]} 
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Hidden Audio Elements for remote streams */}
      {Array.from(remoteConsumers.values()).map(c => (
        <audio key={c.id} ref={el => { if(el && c.track) el.srcObject = new MediaStream([c.track]); }} autoPlay />
      ))}
    </div>
  );
}