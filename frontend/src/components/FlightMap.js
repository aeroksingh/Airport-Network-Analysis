import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { flightAPI } from '../services/api';

// Fix Leaflet's default icon missing issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom plane icon for moving flights
const planeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3163/3163200.png', 
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Airport locations in India
const AIRPORTS = {
  DEL: { name: 'Indira Gandhi Int. Airport', coords: [28.5562, 77.1000] },
  BOM: { name: 'Chhatrapati Shivaji Maharaj Int. Airport', coords: [19.0896, 72.8656] },
  BLR: { name: 'Kempegowda Int. Airport', coords: [13.1986, 77.7066] },
  CCU: { name: 'Netaji Subhas Chandra Bose Int. Airport', coords: [22.6520, 88.4467] }
};

export default function FlightMap() {
  const [flights, setFlights] = useState([]);
  const updatedArrivalsRef = useRef(new Set()); // to avoid duplicate arrival updates
  // tracked map of flights shown on the map (only when gate assigned)
  const [tracked, setTracked] = useState([]);
  const trackedRef = useRef(new Map());

  // Compute progress based on departure/arrival timestamps
  const computeProgress = (flight) => {
    try {
      if (flight.departureTime && flight.arrivalTime) {
        const dep = new Date(flight.departureTime).getTime();
        const arr = new Date(flight.arrivalTime).getTime();
        const now = Date.now();
        if (isNaN(dep) || isNaN(arr) || arr <= dep) return 0;
        if (now < dep) return 0;
        if (now >= arr) return 1;
        return (now - dep) / (arr - dep);
      }
    } catch (err) {
      return 0;
    }
    return flight.progress || 0;
  };

  // Fetch flights from backend
  const fetchFlights = async () => {
    try {
      const res = await flightAPI.getAll();
      const list = res.data?.data || [];
      setFlights(list.map(f => ({ ...f, progress: computeProgress(f) })));

      // Sync tracked flights: add newly gate-assigned flights, update existing
      const nowIds = new Set(list.map(f => f._id));
      // Update or add tracked entries
      for (const f of list) {
        const id = f._id;
        const existing = trackedRef.current.get(id);
        const startEntry = AIRPORTS[f.origin];
        const endEntry = AIRPORTS[f.destination];

        // ignore flights with unknown airports
        if (!startEntry || !endEntry) continue;

        const start = startEntry.coords;
        const end = endEntry.coords;
        const progress = computeProgress(f);
        const distanceKm = computeDistanceKm(start, end);

        // Only show marker when gate has been assigned
        const gateAssigned = !!f.gate;

        if (existing) {
          // update stored flight object
          existing.flight = f;
          existing.progress = progress;
          existing.currentPos = getIntermediatePosition(start, end, progress);
          existing.distanceKm = distanceKm;
          existing.start = start;
          existing.end = end;
          existing.gateAssigned = gateAssigned;
          existing.status = f.status;
        } else if (gateAssigned) {
          // create initial tracked entry (marker appears at source coords)
          trackedRef.current.set(id, {
            _id: id,
            flight: f,
            flightNumber: f.flightNumber,
            origin: f.origin,
            destination: f.destination,
            status: f.status,
            progress,
            start,
            end,
            currentPos: start.slice(),
            distanceKm,
            gateAssigned: true,
            landing: false,
          });
        }
      }

      // Remove tracked flights that no longer exist in backend
      for (const id of Array.from(trackedRef.current.keys())) {
        if (!nowIds.has(id)) {
          trackedRef.current.delete(id);
        }
      }

      setTracked(Array.from(trackedRef.current.values()));
    } catch (err) {
      console.error('Failed to fetch flights:', err);
    }
  };

  useEffect(() => {
    fetchFlights();
    const refetch = setInterval(fetchFlights, 15000); // refresh every 15s
    return () => clearInterval(refetch);
  }, []);

  // Tick to update progress and mark arrivals once
  useEffect(() => {
    const tick = setInterval(() => {
      // Update flights array progress for summary cards
      setFlights(prev => prev.map(f => ({ ...f, progress: computeProgress(f) })));

      // Update tracked markers positions and handle arrival lifecycle
      const now = Date.now();
      for (const [id, obj] of trackedRef.current.entries()) {
        const f = obj.flight;
        if (!f) continue;
        const prog = computeProgress(f);
        obj.progress = prog;
        obj.currentPos = getIntermediatePosition(obj.start, obj.end, prog);

        // compute speed (km/h) based on remaining distance and time
        if (prog > 0 && prog < 1) {
          const remainingKm = obj.distanceKm * (1 - prog);
          const arr = new Date(f.arrivalTime).getTime();
          const secsRemaining = Math.max(1, (arr - now) / 1000);
          const kmPerSec = remainingKm / secsRemaining;
          obj.speedKmph = Math.round(kmPerSec * 3600);
        } else {
          const dep = new Date(f.departureTime).getTime();
          const arr = new Date(f.arrivalTime).getTime();
          const totalSecs = Math.max(1, (arr - dep) / 1000);
          const kmPerSec = obj.distanceKm / totalSecs;
          obj.speedKmph = Math.round(kmPerSec * 3600);
        }

        // Arrival handling: trigger landing animation then remove
        if (prog >= 1 && !obj.landing) {
          obj.landing = true;
          // update backend once
          if (!updatedArrivalsRef.current.has(id)) {
            updatedArrivalsRef.current.add(id);
            flightAPI.update(id, { status: 'Arrived' }).catch((e) => console.warn('Arrival update failed', e));
          }
          // keep marker for animation then remove
          setTimeout(() => {
            trackedRef.current.delete(id);
            setTracked(Array.from(trackedRef.current.values()));
          }, 900); // animation duration (ms)
        }
      }

      setTracked(Array.from(trackedRef.current.values()));
    }, 1000); // update once per second
    return () => clearInterval(tick);
  }, []);

  // Calculate intermediate position between start and end based on progress
  const getIntermediatePosition = (startCoords, endCoords, progress) => {
    const lat = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
    const lng = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;
    return [lat, lng];
  };

  // Haversine distance (km)
  const computeDistanceKm = (startCoords, endCoords) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const [lat1, lon1] = startCoords;
    const [lat2, lon2] = endCoords;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Create a small div icon for animated landing/fade effects
  const createPlaneDivIcon = (landing) => {
    const className = `plane-marker ${landing ? 'landing' : ''}`;
    return L.divIcon({
      html: `<div class="${className}">✈</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '15px' }}>
      <h2 style={{ color: '#f0f4ff', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Live Flight Operations Map</h2>
      
      {/* Full-width Map Container */}
      <div style={{ height: '550px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #1e2d45', zIndex: 1 }}>
        <MapContainer center={[22.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Airport Markers */}
          {Object.entries(AIRPORTS).map(([code, data]) => (
            <Marker key={code} position={data.coords}>
              <Popup>{data.name} ({code})</Popup>
            </Marker>
          ))}

          {/* Flight Routes and Moving Aircraft (tracked, gate-assigned only) */}
          <style>{`
            .plane-marker{ width:28px; height:28px; display:flex; align-items:center; justify-content:center; background:transparent; color:#ffd166; font-size:16px; transition: transform 900ms ease, opacity 900ms ease; }
            .plane-marker.landing{ transform: scale(0.2); opacity: 0; }
          `}</style>
          {tracked.map(obj => {
            const start = obj.start;
            const end = obj.end;
            if (!start || !end) return null;
            const currentPos = obj.currentPos || getIntermediatePosition(start, end, obj.progress || 0);
            const lineColor = obj.status === 'Delayed' ? '#ef4444' : '#4facfe';

            return (
              <LayerGroup key={obj._id}>
                <Polyline positions={[start, end]} color={lineColor} weight={2} dashArray={obj.status === 'Delayed' ? '1, 6' : '5, 5'} opacity={0.85} />

                <Marker position={currentPos} icon={createPlaneDivIcon(obj.landing)}>
                  <Popup>
                    <div style={{color: '#000'}}>
                      <strong style={{fontSize: '16px'}}>{obj.flightNumber || obj._id}</strong><br/>
                      Destination: {obj.destination}<br/>
                      Transmission Speed: {obj.speedKmph ? `${obj.speedKmph} km/h` : '—'}<br/>
                      Status: <span style={{color: obj.status === 'Delayed' ? '#ef4444' : '#d97706', fontWeight: 'bold'}}>{obj.status}</span>
                    </div>
                  </Popup>
                </Marker>
              </LayerGroup>
            );
          })}
        </MapContainer>
      </div>

      {/* Flight Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {flights.map(flight => (
          <div key={flight._id || flight.flightNumber} style={{ 
            padding: '15px', 
            backgroundColor: '#1e293b', 
            borderLeft: '3px solid #4facfe',
            borderRadius: '8px',
            color: '#f0f4ff'
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{flight.flightNumber || (flight._id ? flight._id.slice(-6) : '—')}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {flight.origin} → {flight.destination}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              {flight.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
