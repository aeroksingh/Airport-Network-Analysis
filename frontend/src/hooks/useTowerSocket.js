import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000')
  .replace(/^http/, 'ws') + '/ws/tower';

const MAX = 50;
const cap = arr => arr.slice(0, MAX);

export default function useTowerSocket({ userId, userName, userRole, token } = {}) {
  const [connected,     setConnected]    = useState(false);
  const [networkSignal, setSignal]       = useState(null);
  const [incomingFiles, setFiles]        = useState([]);
  const [logEvents,     setLogs]         = useState([]);
  const [onlineUsers,   setOnline]       = useState([]);
  const [adminActions,  setAdmin]        = useState([]);

  const ws     = useRef(null);
  const timer  = useRef(null);
  const alive  = useRef(true);

  const send = useCallback(payload => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify(payload));
  }, []);

  const sendNetworkControl = useCallback((signal, targetUserId) => {
    send({ type: 'NETWORK_CONTROL', signal, senderId: userId, senderName: userName, targetUserId: targetUserId || null });
  }, [send, userId, userName]);

  useEffect(() => {
    alive.current = true;

    function connect() {
      clearTimeout(timer.current);
      const sock = new WebSocket(WS_URL);
      ws.current = sock;

      sock.onopen = () => {
        if (!alive.current) return;
        setConnected(true);
        if (userId && token)
          sock.send(JSON.stringify({ type: 'IDENTIFY', userId, userName, userRole, token }));
      };

      sock.onmessage = evt => {
        if (!alive.current) return;
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.type) {
            case 'IDENTIFY_ACK':  setOnline(msg.connectedUsers || []); break;
            case 'USER_PRESENCE':
              if (msg.event === 'ONLINE')  setOnline(p => [...new Set([...p, msg.userId])]);
              else                          setOnline(p => p.filter(i => i !== msg.userId));
              break;
            case 'NETWORK_CONTROL':
              setSignal({ signal: msg.signal, senderName: msg.senderName, targetUserId: msg.targetUserId, timestamp: msg.timestamp });
              setLogs(p => cap([{ event: msg.signal, action: msg.signal, signal: msg.signal,
                senderName: msg.senderName, isBroadcast: !msg.targetUserId, timestamp: msg.timestamp }, ...p]));
              break;
            case 'FILE_INCOMING': setFiles(p => cap([msg, ...p])); break;
            case 'LOG_EVENT':     setLogs(p => cap([msg, ...p]));  break;
            case 'ADMIN_ACTION':
              setAdmin(p => cap([msg, ...p]));
              setLogs(p => cap([{ ...msg, event: msg.action }, ...p]));
              break;
            case 'USER_KICKED':
              if (String(msg.userId) === String(userId))
                window.dispatchEvent(new CustomEvent('airtower:kicked', { detail: msg }));
              break;
            default: break;
          }
        } catch {}
      };

      sock.onclose = () => {
        if (!alive.current) return;
        setConnected(false);
        timer.current = setTimeout(() => { if (alive.current) connect(); }, 4000);
      };
      sock.onerror = () => {};
    }

    if (userId && token) connect();

    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      if (ws.current) { ws.current.onclose = null; ws.current.close(); }
    };
  }, [userId, token]); // eslint-disable-line

  return { connected, networkSignal, incomingFiles, logEvents, onlineUsers, adminActions, sendNetworkControl, send };
}
