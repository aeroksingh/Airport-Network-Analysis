    import React, { useState, useEffect } from 'react';
    import { Link } from 'react-router-dom';
    import { flightAPI, passengerAPI, gateAPI } from '../services/api';
    import { useAuth } from '../App';
    import { FlightStatusBadge } from '../components/StatusBadge';
    import FlightMap from '../components/FlightMap.js';
    import NetworkMonitor from '../components/NetworkMonitor.jsx';

    export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ flights: 0, passengers: 0, gates: 0, checkedIn: 0 });
    const [recentFlights, setRecentFlights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
        try {
            const [flightsRes, passengersRes, gatesRes] = await Promise.all([
            flightAPI.getAll(),
            passengerAPI.getAll(),
            gateAPI.getAll(),
            ]);
            const flights = flightsRes.data.data;
            const passengers = passengersRes.data.data;
            const gates = gatesRes.data.data;

            setStats({
            flights: flights.length,
            passengers: passengers.length,
            gates: gates.length,
            checkedIn: passengers.filter((p) => p.checkedIn).length,
            available: gates.filter((g) => g.status === 'Available').length,
            active: flights.filter((f) =>
                ['Scheduled', 'Boarding', 'Delayed'].includes(f.status)
            ).length,
            });
            setRecentFlights(flights.slice(0, 5));
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
        };
        fetchData();
    }, []);

    const statCards = [
        { label: 'Total Flights',    value: stats.flights,    icon: '✈', color: '#3b82f6', sub: `${stats.active || 0} active` },
        { label: 'Total Passengers', value: stats.passengers,  icon: '◈', color: '#06b6d4', sub: `${stats.checkedIn || 0} checked in` },
        { label: 'Total Gates',      value: stats.gates,       icon: '▣', color: '#10b981', sub: `${stats.available || 0} available` },
        { label: 'Check-in Rate',
        value: stats.passengers > 0
            ? `${Math.round((stats.checkedIn / stats.passengers) * 100)}%`
            : '—',
        icon: '✓', color: '#8b5cf6',
        sub: `${stats.checkedIn || 0} / ${stats.passengers || 0}` },
    ];

    return (
        <div>
        {/* Header */}
        <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
                <h1 className="page-title">AIR TOWER — Control Tower</h1>
                <p className="page-subtitle">
                Welcome back, <strong style={{ color: '#60a5fa' }}>{user?.name}</strong> — here's the live airport status.
                </p>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#4a6080' }}>
                {new Date().toLocaleString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short',
                day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
            </div>
            </div>
        </div>

        {/* Stat Cards */}
        {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading dashboard...</span></div>
        ) : (
            <>
            <div className="stats-grid">
                {statCards.map((s) => (
                <div className="stat-card" key={s.label} style={{ borderTop: `2px solid ${s.color}30` }}>
                    <div style={{ fontSize: 22, marginBottom: 10, color: s.color }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#4a6080', marginTop: 6, fontWeight: 500 }}>{s.sub}</div>
                </div>
                ))}
            </div>

            {/* Live Flight Map */}
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <FlightMap />
            </div>

            {/* Network Monitor (NOC panel) */}
            <div style={{ marginTop: '12px', marginBottom: '24px' }}>
                <NetworkMonitor />
            </div>

            {/* Recent Flights */}
            <div className="card">
                <div className="card-header">
                <h2 style={{ fontFamily: 'monospace', fontSize: 15, color: '#f0f4ff' }}>
                    Recent Flights
                </h2>
                <Link to="/flights" className="btn btn-secondary btn-sm">View All →</Link>
                </div>

                {recentFlights.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✈</div>
                    <p>No flights yet. <Link to="/flights" style={{ color: '#3b82f6' }}>Add one</Link></p>
                </div>
                ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                    <thead>
                        <tr>
                        <th>Flight No.</th>
                        <th>Airline</th>
                        <th>Route</th>
                        <th>Departure</th>
                        <th>Status</th>
                        <th>Gate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentFlights.map((f) => (
                        <tr key={f._id}>
                            <td><strong className="mono">{f.flightNumber}</strong></td>
                            <td>{f.airline}</td>
                            <td>
                            <span style={{ color: '#06b6d4' }}>{f.origin}</span>
                            <span style={{ color: '#4a6080', margin: '0 6px' }}>→</span>
                            <span>{f.destination}</span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {new Date(f.departureTime).toLocaleString('en-US', {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                            </td>
                            <td><FlightStatusBadge status={f.status} /></td>
                            <td>
                            {f.gate ? (
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#10b981' }}>
                                {f.gate.gateNumber}
                                </span>
                            ) : (
                                <span style={{ color: '#4a6080', fontSize: 12 }}>Unassigned</span>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                { to: '/flights', icon: '✈', label: 'Manage Flights', color: '#3b82f6' },
                { to: '/passengers', icon: '◈', label: 'Manage Passengers', color: '#06b6d4' },
                { to: '/gates', icon: '▣', label: 'Manage Gates', color: '#10b981' },
                { to: '/files', icon: '📡', label: 'File Transfer', color: '#06b6d4' },
                ].map((qa) => (
                <Link key={qa.to} to={qa.to} style={{
                    ...quickActionStyle,
                    borderColor: `${qa.color}30`,
                }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = qa.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = `${qa.color}30`}
                >
                    <span style={{ fontSize: 24, color: qa.color }}>{qa.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#8899bb' }}>{qa.label}</span>
                </Link>
                ))}
            </div>
            </>
        )}
        </div>
    );
    }

    const quickActionStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '24px 16px',
    background: '#161d2e',
    border: '1px solid',
    borderRadius: 12,
    textDecoration: 'none',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
    };