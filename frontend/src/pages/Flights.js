    import React, { useState, useEffect, useCallback } from 'react';
    import { toast } from 'react-toastify';
    import { flightAPI } from '../services/api';
    import useFlightSocket from '../hooks/useFlightSocket';
    import Modal from '../components/Modal';
    import RoleGuard from '../components/RoleGuard';
    import { FlightStatusBadge } from '../components/StatusBadge';

    const STATUSES = ['Scheduled', 'Boarding', 'Departed', 'Arrived', 'Cancelled', 'Delayed'];

    const emptyForm = {
    flightNumber: '', airline: '', origin: '', destination: '',
    departureTime: '', arrivalTime: '', status: 'Scheduled', capacity: 180,
    };

    export default function Flights() {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    // CHANGED: use WebSocket hook for live flight updates instead of polling on mount
    const { flights: socketFlights, connected, wsStats } = useFlightSocket();
    const [modalOpen, setModalOpen] = useState(false);
    const [editFlight, setEditFlight] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [deleteId, setDeleteId] = useState(null);

    // Keep fetchFlights for manual refresh after create/update/delete
    const fetchFlights = useCallback(async () => {
        setLoading(true);
        try {
        const params = filterStatus ? { status: filterStatus } : {};
        const res = await flightAPI.getAll(params);
        setFlights(res.data.data);
        } catch {
        toast.error('Failed to load flights');
        } finally {
        setLoading(false);
        }
    }, [filterStatus]);

    // CHANGED: sync with WebSocket-provided snapshot/updates
    useEffect(() => {
        if (socketFlights && socketFlights.length >= 0) {
            setFlights(socketFlights);
            setLoading(false);
        }
    }, [socketFlights]);

    const openCreate = () => {
        setEditFlight(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (flight) => {
        setEditFlight(flight);
        setForm({
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime?.slice(0, 16),
        arrivalTime: flight.arrivalTime?.slice(0, 16),
        status: flight.status,
        capacity: flight.capacity,
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
        if (editFlight) {
            await flightAPI.update(editFlight._id, form);
            toast.success('Flight updated successfully');
        } else {
            await flightAPI.create(form);
            toast.success('Flight created successfully');
        }
        setModalOpen(false);
        fetchFlights();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
        setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
        await flightAPI.delete(id);
        toast.success('Flight deleted');
        setDeleteId(null);
        fetchFlights();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const formatDT = (dt) =>
        dt ? new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div>
        <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <h1 className="page-title">✈ Flight Management</h1>
                <p className="page-subtitle">{flights.length} flight(s) in system</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* ADDED: WebSocket connection status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 10, background: connected ? '#10b981' : '#ef4444' }} />
                    <div style={{ fontSize: 13, color: connected ? '#064e3b' : '#7f1d1d' }}>{connected ? 'Live' : 'Polling'}</div>
                </div>
                {/* ADDED: small WS stats indicator (protocol / port) */}
                <div style={{ fontSize: 12, color: '#65748b', marginRight: 12 }}>
                    {wsStats?.protocol ? `${wsStats.protocol} @ ${wsStats.port || new URL(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000').port || 5000}` : 'WS: n/a'}
                </div>
                <select
                className="form-control"
                style={{ width: 160 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <RoleGuard roles={['admin', 'staff']}>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Flight</button>
                </RoleGuard>
            </div>
            </div>
        </div>

        <div className="card">
            {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading flights...</span></div>
            ) : flights.length === 0 ? (
            <div className="empty-state">
                <div className="empty-icon">✈</div>
                <p>No flights found. Click "Add Flight" to create one.</p>
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
                    <th>Arrival</th>
                    <th>Capacity</th>
                    <th>Gate</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {flights.map((f) => (
                    <tr key={f._id}>
                        <td><strong className="mono">{f.flightNumber}</strong></td>
                        <td>{f.airline}</td>
                        <td>
                        <span style={{ color: '#06b6d4' }}>{f.origin}</span>
                        <span style={{ color: '#4a6080', margin: '0 6px' }}>→</span>
                        {f.destination}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>{formatDT(f.departureTime)}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{formatDT(f.arrivalTime)}</td>
                        <td>{f.capacity}</td>
                        <td>
                        {f.gate?.gateNumber
                            ? <span className="mono" style={{ color: '#10b981' }}>{f.gate.gateNumber}</span>
                            : <span style={{ color: '#4a6080', fontSize: 12 }}>—</span>}
                        </td>
                        <td><FlightStatusBadge status={f.status} /></td>
                        <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <RoleGuard roles={['admin', 'staff']}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                            </RoleGuard>
                            <RoleGuard roles={['admin']}>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(f._id)}>Del</button>
                            </RoleGuard>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </div>

        {/* Create / Edit Modal */}
        <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editFlight ? `Edit — ${editFlight.flightNumber}` : 'Add New Flight'}
        >
            <form onSubmit={handleSubmit}>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Flight Number</label>
                <input name="flightNumber" className="form-control" placeholder="AI-202"
                    value={form.flightNumber} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Airline</label>
                <input name="airline" className="form-control" placeholder="Air India"
                    value={form.airline} onChange={handleChange} required />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Origin (IATA)</label>
                <input name="origin" className="form-control" placeholder="DEL"
                    value={form.origin} onChange={handleChange} required maxLength={3} />
                </div>
                <div className="form-group">
                <label className="form-label">Destination (IATA)</label>
                <input name="destination" className="form-control" placeholder="BOM"
                    value={form.destination} onChange={handleChange} required maxLength={3} />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Departure Time</label>
                <input name="departureTime" type="datetime-local" className="form-control"
                    value={form.departureTime} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Arrival Time</label>
                <input name="arrivalTime" type="datetime-local" className="form-control"
                    value={form.arrivalTime} onChange={handleChange} required />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Capacity</label>
                <input name="capacity" type="number" className="form-control" min={1}
                    value={form.capacity} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Saving...</> : (editFlight ? 'Update Flight' : 'Create Flight')}
                </button>
            </div>
            </form>
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
            <p style={{ color: '#8899bb', marginBottom: 24 }}>
            Are you sure you want to delete this flight? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete Flight</button>
            </div>
        </Modal>
        </div>
    );
    }