'use client';

import { useState, useEffect, useRef } from 'react';

// -----------------------------------------------------------------------------
// ICONS
// -----------------------------------------------------------------------------
const IconRefresh = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>);
const IconTrash = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);
const IconLock = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>);
const IconMegaphone = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.996.912 2.168 1.929 3.186 1.302 1.303 2.945 2.088 4.257 2.088 1.313 0 2.955-.785 4.257-2.088 1.972-1.972 1.972-5.17 0-7.143m-10.443 4.056a20.32 20.32 0 010-7.91m3.102 8.25a13.93 13.93 0 010-8.59" /></svg>);
const IconSignal = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v18M12 3v18M15.75 3v18M5.25 9h13.5m-13.5 6h13.5" /></svg>);

// -----------------------------------------------------------------------------
// API CLIENT
// -----------------------------------------------------------------------------
const API_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || 'http://localhost:4000';

async function fetchStats(secret) {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { 'x-admin-secret': secret }
  });
  if (!res.ok) throw new Error('Unauthorized or Failed');
  return res.json();
}

async function updateSettings(secret, body) {
  const res = await fetch(`${API_URL}/admin/settings`, {
    method: 'POST',
    headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function closeRoom(secret, roomId) {
  const res = await fetch(`${API_URL}/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': secret }
  });
  return res.json();
}

async function broadcastMessage(secret, roomId, message) {
  const res = await fetch(`${API_URL}/admin/broadcast`, {
    method: 'POST',
    headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, message })
  });
  return res.json();
}

// -----------------------------------------------------------------------------
// LOGIN COMPONENT
// -----------------------------------------------------------------------------
function Login({ onLogin }) {
  const [val, setVal] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200">
      <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
          <IconLock /> Admin Access
        </h1>
        <input 
          type="password" 
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Enter Admin Secret" 
          className="w-full p-3 bg-black border border-neutral-700 rounded mb-4 focus:border-indigo-500 focus:outline-none transition-colors"
        />
        <button 
          onClick={() => onLogin(val)} 
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded font-medium transition-colors"
        >
          Unlock Dashboard
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// DASHBOARD COMPONENT
// -----------------------------------------------------------------------------
export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // On Mount, check localstorage
  useEffect(() => {
    const s = localStorage.getItem('jam_admin_secret');
    if (s) {
      setSecret(s);
      loadData(s);
    }
  }, []);

  useEffect(() => {
    if (!secret) return;
    const interval = setInterval(() => loadData(secret, true), 5000);
    return () => clearInterval(interval);
  }, [secret]);

  const loadData = async (s, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const stats = await fetchStats(s);
      setData(stats);
      setError(null);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('Unauthorized')) {
        setSecret('');
        localStorage.removeItem('jam_admin_secret');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogin = (s) => {
    setSecret(s);
    localStorage.setItem('jam_admin_secret', s);
    loadData(s);
  };

  const updatePolicy = async (body) => {
    await updateSettings(secret, body);
    loadData(secret, true);
  };

  const nukeRoom = async (roomId) => {
    if (!confirm(`Close room ${roomId}?`)) return;
    await closeRoom(secret, roomId);
    loadData(secret, true);
  };

  const sendBroadcast = async (roomId = 'ALL') => {
    if (!broadcastMsg) return;
    await broadcastMessage(secret, roomId, broadcastMsg);
    setBroadcastMsg('');
    alert('Message Sent!');
  };

  if (!secret) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-bold text-white">Jam Admin</h1>
            <p className="text-neutral-500 text-sm mt-1">Network Operations Center</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded ${error ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
              {error ? 'Disconnected' : 'Live'}
            </span>
            <button onClick={() => loadData(secret)} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded">
              <IconRefresh />
            </button>
            <button onClick={() => {setSecret(''); localStorage.removeItem('jam_admin_secret');}} className="text-xs text-neutral-500 hover:text-white">
              Logout
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 p-4 rounded border border-neutral-800">
              <p className="text-neutral-500 text-xs uppercase font-bold">Rooms</p>
              <p className="text-3xl font-bold text-indigo-400">{data.totalRooms}</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded border border-neutral-800">
              <p className="text-neutral-500 text-xs uppercase font-bold">Peers</p>
              <p className="text-3xl font-bold text-green-400">{data.totalParticipants}</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded border border-neutral-800">
              <p className="text-neutral-500 text-xs uppercase font-bold">Init Bitrate</p>
              <p className="text-3xl font-bold text-white">{(data.policies.initialBitrate / 1000)}k</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded border border-neutral-800">
              <p className="text-neutral-500 text-xs uppercase font-bold">Opus Mode</p>
              <p className="text-xl font-bold text-white mt-2">
                {data.policies.opusFec ? 'FEC:ON' : 'FEC:OFF'} / {data.policies.opusDtx ? 'DTX:ON' : 'DTX:OFF'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Room List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Active Sessions</h2>
            <div className="space-y-3">
              {data?.rooms.length === 0 && <div className="p-8 text-center border border-dashed border-neutral-800 rounded text-neutral-600">No active sessions.</div>}
              {data?.rooms.map((room) => (
                <div key={room.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-mono font-medium text-white">{room.id}</span>
                      <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                        {Math.floor(room.duration / 60)}m {room.duration % 60}s
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-neutral-400">
                      <span>👥 {room.participants}</span>
                      <span>🎤 {room.producers.audio}</span>
                      <span>📹 {room.producers.video}</span>
                    </div>
                  </div>
                  <button onClick={() => nukeRoom(room.id)} className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded text-sm font-medium flex items-center gap-2">
                    <IconTrash /> Kill
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Global Controls */}
          <div className="space-y-6">
            
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded shadow-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <IconLock /> Access Control
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                  <span className="text-sm">Allow Video</span>
                  <input type="checkbox" checked={data?.policies.allowVideo || false} onChange={e => updatePolicy({ allowVideo: e.target.checked })} className="w-5 h-5 accent-green-600" />
                </div>
                <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                  <span className="text-sm">Maintenance Mode</span>
                  <input type="checkbox" checked={data?.policies.maintenanceMode || false} onChange={e => updatePolicy({ maintenanceMode: e.target.checked })} className="w-5 h-5 accent-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded shadow-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <IconSignal /> Network Tuning
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Initial Bitrate (kbps)</label>
                  <select 
                    value={data?.policies.initialBitrate || 1000000} 
                    onChange={e => updatePolicy({ initialBitrate: parseInt(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm"
                  >
                    <option value="300000">300 kbps (Low)</option>
                    <option value="500000">500 kbps (Medium)</option>
                    <option value="1000000">1000 kbps (High)</option>
                    <option value="2000000">2000 kbps (Ultra)</option>
                  </select>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                  <div>
                    <span className="block text-sm">Opus FEC</span>
                    <span className="text-[10px] text-neutral-500">Error Correction (More Bandwidth)</span>
                  </div>
                  <input type="checkbox" checked={data?.policies.opusFec || false} onChange={e => updatePolicy({ opusFec: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                </div>

                <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                  <div>
                    <span className="block text-sm">Opus DTX</span>
                    <span className="text-[10px] text-neutral-500">Silence Suppression (Bad for Music)</span>
                  </div>
                  <input type="checkbox" checked={data?.policies.opusDtx || false} onChange={e => updatePolicy({ opusDtx: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded shadow-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <IconMegaphone /> Broadcast
              </h2>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="System alert..." className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-sm min-h-[80px] mb-3 focus:border-indigo-500 focus:outline-none" />
              <button onClick={() => sendBroadcast()} disabled={!broadcastMsg} className="w-full bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded font-medium">Send</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}