import { useState, useEffect, useRef } from 'react';

const WS_URL = (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000')
  .replace(/^http/, 'ws') + '/ws/tower';

export default function useFlightSocket() {
  const [flights,   setFlights]  = useState([]);
  const [connected, setConn]     = useState(false);
  const [wsStats,   setStats]    = useState({ protocol: null, port: null });

  const ws    = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;

    function connect() {
      clearTimeout(timer.current);
      const sock = new WebSocket(WS_URL);
      ws.current = sock;

      sock.onopen = () => { if (!alive) return; setConn(true); };

      sock.onmessage = evt => {
        if (!alive) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'CONNECTED')
            setStats({ protocol: msg.protocol || 'WebSocket/RFC-6455', port: msg.port || 5000 });
          else if (msg.type === 'FLIGHT_SNAPSHOT')
            setFlights((msg.flights || []).slice(0, 200));
          else if (msg.type === 'FLIGHT_UPDATE') {
            const { action, flight } = msg;
            if (action === 'CREATED')        setFlights(p => [flight, ...p].slice(0, 200));
            else if (action === 'UPDATED')   setFlights(p => p.map(f => f._id === flight._id ? flight : f));
            else if (action === 'DELETED')   setFlights(p => p.filter(f => f._id !== flight._id && f._id !== flight.id));
          }
        } catch {}
      };

      sock.onclose = () => {
        if (!alive) return;
        setConn(false);
        timer.current = setTimeout(() => { if (alive) connect(); }, 3000);
      };
      sock.onerror = () => {};
    }

    connect();
    return () => {
      alive = false;
      clearTimeout(timer.current);
      if (ws.current) { ws.current.onclose = null; ws.current.close(); }
    };
  }, []);

  return { flights, connected, wsStats };
}
