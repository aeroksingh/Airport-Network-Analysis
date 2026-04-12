import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import axios from 'axios';
import { Server, Database, Cloud } from 'lucide-react';
import { useAuth } from '../App';

const ANIM_DURATION = 1200; // ms for packet animation

const mongoStateLabel = (s) => (s === 1 ? 'Connected' : s === 2 ? 'Connecting' : 'Disconnected');

export default function NetworkMonitor() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);
  const logsContainerRef = useRef(null);

  const [packets, setPackets] = useState([]); // {id,edge}
  const packetsRef = useRef([]);

  const [dbStatus, setDbStatus] = useState({ mongoState: 0, latency: null });
  const [reverseProxy, setReverseProxy] = useState(false);
  const [lastClientSuccess, setLastClientSuccess] = useState(0);

  // Retrieve current user name from AuthContext or localStorage
  const getUserName = () => {
    if (user && user.name) return user.name;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) return parsed.name;
        if (typeof parsed === 'string' && parsed.length) return parsed;
      }
    } catch (e) {
      // ignore parse errors
    }
    return localStorage.getItem('username') || localStorage.getItem('name') || 'Anonymous';
  };

  // keep logs capped and push (now includes user metadata)
  const pushLog = (line) => {
    const entry = `${new Date().toISOString()} [USER: ${getUserName()}] ${line}`;
    logsRef.current = [...logsRef.current.slice(-499), entry];
    setLogs([...logsRef.current]);
  };

  // Download current logs as a .log file
  const downloadLogs = () => {
    const content = logsRef.current.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const filename = `network_audit_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const addPacket = (edge) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const p = { id, edge };
    packetsRef.current = [...packetsRef.current, p];
    setPackets([...packetsRef.current]);
    setTimeout(() => {
      packetsRef.current = packetsRef.current.filter(x => x.id !== id);
      setPackets([...packetsRef.current]);
    }, ANIM_DURATION + 50);
  };

  // Auto-scroll logs when new ones arrive
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Attach interceptors to both default axios and project `api` instance
  useEffect(() => {
    const reqHandler = (config) => {
      config.metadata = config.metadata || {};
      config.metadata.startTime = Date.now();
      // animate client->server packet on every outbound request
      addPacket('cs');
      return config;
    };

    const resHandler = (response) => {
      const duration = response.config?.metadata?.startTime ? Date.now() - response.config.metadata.startTime : -1;
      const method = (response.config?.method || 'GET').toUpperCase();
      const url = response.config?.url || '';
      const status = response.status;
      const statusText = response.statusText || '';
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const label = isWrite ? '[WRITE OPERATION]' : '[HTTP]';
      pushLog(`${label} OUTBOUND -> ${method} ${url} | INBOUND <- ${status} ${statusText} (${duration}ms)`);

      // nginx detection
      const serverHeader = (response.headers && (response.headers['server'] || response.headers['Server'])) || '';
      if (serverHeader && serverHeader.toLowerCase().includes('nginx')) setReverseProxy(true);

      // highlight client->server when backend responds OK
      if (status >= 200 && status < 300) setLastClientSuccess(Date.now());

      // If this is the network status endpoint, parse DB info and animate server->db
      if (String(url).includes('/network/status')) {
        const payload = response.data?.data || response.data || {};
        const mongoState = payload.mongoState ?? payload.mongo_state ?? null;
        const latency = payload.dbLatencyMs ?? payload.dbLatency ?? payload.latency ?? null;
        if (typeof mongoState === 'number') {
          setDbStatus({ mongoState, latency });
        }
        // animate server->db
        addPacket('sd');
      }

      return response;
    };

    const errHandler = (error) => {
      const cfg = error.config || {};
      const duration = cfg.metadata?.startTime ? Date.now() - cfg.metadata.startTime : -1;
      const method = (cfg.method || 'GET').toUpperCase();
      const url = cfg.url || (error.request && error.request.responseURL) || '';
      const status = error.response?.status;
      const statusText = error.response?.statusText || error.message || 'ERROR';
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const label = isWrite ? '[WRITE OPERATION]' : '[HTTP]';
      if (status) {
        pushLog(`${label} OUTBOUND -> ${method} ${url} | INBOUND <- ${status} ${statusText} (${duration}ms)`);
      } else {
        pushLog(`${label} OUTBOUND -> ${method} ${url} | ERROR <- ${statusText} (${duration}ms)`);
      }
      const serverHeader = error.response?.headers && (error.response.headers['server'] || error.response.headers['Server']) || '';
      if (serverHeader && serverHeader.toLowerCase().includes('nginx')) setReverseProxy(true);
      return Promise.reject(error);
    };

    // register interceptors
    const aReq = axios.interceptors.request.use(reqHandler, e => Promise.reject(e));
    const aRes = axios.interceptors.response.use(resHandler, errHandler);
    const apiReq = api.interceptors.request.use(reqHandler, e => Promise.reject(e));
    const apiRes = api.interceptors.response.use(resHandler, errHandler);

    return () => {
      try { axios.interceptors.request.eject(aReq); } catch(e) {}
      try { axios.interceptors.response.eject(aRes); } catch(e) {}
      try { api.interceptors.request.eject(apiReq); } catch(e) {}
      try { api.interceptors.response.eject(apiRes); } catch(e) {}
    };
  }, []);

  // Poll /api/network/status for DB connectivity and latency
  useEffect(() => {
    let mounted = true;
    let timerId = null;

    const fetchStatus = async () => {
      try {
        // Use native fetch to bypass axios interceptors, preventing log spam
        const API = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
        const res = await fetch(`${API}/api/network/status`);
        if (res.ok) {
          const payload = await res.json();
          const isConnected = payload.database === 'Connected';
          
          if (mounted) {
            // Heartbeat successful: pulse colors and animate packets!
            setLastClientSuccess(Date.now());
            addPacket('cs');
            if (isConnected) addPacket('sd');
            
            setDbStatus({ mongoState: isConnected ? 1 : 0, latency: payload.latency || null });
          }
          // Continue standard polling cycle
          if (mounted) timerId = setTimeout(fetchStatus, 3000);
        } else {
          throw new Error('Server returned non-200 OK');
        }
      } catch (e) {
        if (mounted) {
          setDbStatus(prev => ({ ...prev, mongoState: 0 }));
          // Retry Logic: Temporarily back off for 12 seconds if the server drops, to prevent massive console spam
          timerId = setTimeout(fetchStatus, 12000); 
        }
      }
    };

    fetchStatus();
    return () => { mounted = false; clearTimeout(timerId); };
  }, []);

  const clearLogs = () => { logsRef.current = []; setLogs([]); };
  const clientServerActive = Date.now() - lastClientSuccess < 2000;

  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif', color: '#e6eef8' }}>
      <style>{`
        .nm-root{ background:#061226; border-radius:10px; padding:14px; box-shadow:0 6px 28px rgba(2,6,23,0.6);} 
        .nm-header{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px }
        .nm-title{ font-size:16px; font-weight:700; color:#cbe7ff }
        .badge{ background:#111827; color:#fef3c7; padding:6px 10px; border-radius:999px; font-size:12px; border:1px solid #374151 }
        .nm-topo{ display:flex; align-items:center; gap:12px; padding:18px; background:linear-gradient(180deg,#041022, #071226); border-radius:8px; }
        .nm-node{ width:86px; text-align:center; color:#9fb6d9 }
        .node-label{ margin-top:6px; font-size:12px; color:#a8c2e0 }
        .edge{ flex:1; height:6px; background:#122232; border-radius:6px; position:relative; overflow:hidden }
        .edge.cs.active{ background:linear-gradient(90deg,#10b981,#065f46); box-shadow:0 0 8px rgba(16,185,129,0.18) }
        .edge.sd.active{ background:linear-gradient(90deg,#34d399,#059669); box-shadow:0 0 8px rgba(52,211,153,0.14) }
        .packet{ position:absolute; top:50%; transform:translateY(-50%); width:10px; height:10px; border-radius:50%; background:#ffd166; box-shadow:0 0 8px #ffd166; animation:move ${ANIM_DURATION}ms linear forwards }
        .packet.sd{ background:#7dd3fc; box-shadow:0 0 8px #7dd3fc }
        @keyframes move{ from{ left:0; opacity:1 } to{ left:calc(100% - 10px); opacity:0.12 } }
        .nm-stats{ margin-top:12px; display:flex; gap:12px; align-items:center }
        .nm-stat{ background:#07162a; padding:8px 12px; border-radius:8px; color:#cde7ff; font-size:13px; border:1px solid #122a3a }
        .nm-logs{ margin-top:12px; height:180px; background:#020814; border-radius:8px; padding:10px; overflow:auto; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace; font-size:12px; color:#bfe7ff; border:1px solid #0c2836 }
        .nm-controls{ display:flex; gap:8px; align-items:center }
        .clear-btn{ background:#0b1220; border:1px solid #113041; color:#cfe8ff; padding:6px 8px; border-radius:6px; cursor:pointer }
        .download-btn{ background:#08202b; border:1px solid #113041; color:#cfe8ff; padding:6px 8px; border-radius:6px; cursor:pointer }
      `}</style>

      <div className="nm-root">
        <div className="nm-header">
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <div className="nm-title">Network Monitor</div>
            {reverseProxy && <div className="badge">Reverse Proxy Detected</div>}
          </div>
          <div className="nm-controls">
            <div style={{fontSize:12, color:'#93c5fd'}}>{`DB: ${mongoStateLabel(dbStatus.mongoState)}${dbStatus.latency ? ` • ${dbStatus.latency}ms` : ''}`}</div>
            <div className="badge" style={{ marginLeft: 8 }}>{`Active User: ${getUserName()}`}</div>
            <button className="download-btn" onClick={downloadLogs}>Download Logs</button>
            <button className="clear-btn" onClick={clearLogs}>Clear Logs</button>
          </div>
        </div>

        <div className="nm-topo">
          <div className="nm-node">
            <Cloud size={28} color="#7dd3fc" />
            <div className="node-label">Client</div>
          </div>

          <div className={`edge cs ${clientServerActive ? 'active' : ''}`} style={{minWidth:80}}>
            {packets.filter(p => p.edge === 'cs').map(p => (
              <div key={p.id} className="packet" />
            ))}
          </div>

          <div className="nm-node">
            <Server size={28} color={clientServerActive ? '#9ff7d0' : '#9fb6d9'} />
            <div className="node-label">Server</div>
          </div>

          <div className={`edge sd ${dbStatus.mongoState === 1 ? 'active' : ''}`} style={{minWidth:80}}>
            {packets.filter(p => p.edge === 'sd').map(p => (
              <div key={p.id} className="packet sd" />
            ))}
          </div>

          <div className="nm-node">
            <Database size={28} color={dbStatus.mongoState === 1 ? '#7ee7b3' : '#9fb6d9'} />
            <div className="node-label">Database</div>
          </div>
        </div>

        <div className="nm-stats">
          <div className="nm-stat">Client → Server: {clientServerActive ? 'Online' : 'Idle'}</div>
          <div className="nm-stat">Server → Database: {mongoStateLabel(dbStatus.mongoState)}</div>
        </div>

        <div ref={logsContainerRef} className="nm-logs">
          <div style={{ margin: 0, whiteSpace: 'pre-wrap', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map((line, idx) => {
              const isWrite = line.includes('[WRITE OPERATION]');
              return (
                <div key={idx} style={{ color: isWrite ? '#ffb4b4' : '#bfe7ff', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
