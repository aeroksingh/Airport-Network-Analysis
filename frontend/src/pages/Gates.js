    import React, { useState, useEffect, useCallback } from 'react';
    import { toast } from 'react-toastify';
    import { gateAPI, flightAPI } from '../services/api';
    import Modal from '../components/Modal';
    import RoleGuard from '../components/RoleGuard';
    import { GateStatusBadge, FlightStatusBadge } from '../components/StatusBadge';

    const GATE_STATUSES = ['Available', 'Occupied', 'Maintenance', 'Closed'];

    const emptyForm = { gateNumber: '', terminal: '', status: 'Available', capacity: 200 };

    export default function Gates() {
    const [gates, setGates] = useState([]);
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editGate, setEditGate] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [assignGateId, setAssignGateId] = useState(null);
    const [selectedFlight, setSelectedFlight] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
        const params = filterStatus ? { status: filterStatus } : {};
        const [gateRes, flightRes] = await Promise.all([
            gateAPI.getAll(params),
            flightAPI.getAll(),
        ]);
        setGates(gateRes.data.data);
        setFlights(flightRes.data.data);
        } catch {
        toast.error('Failed to load data');
        } finally {
        setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditGate(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (gate) => {
        setEditGate(gate);
        setForm({
        gateNumber: gate.gateNumber,
        terminal: gate.terminal,
        status: gate.status,
        capacity: gate.capacity,
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
        if (editGate) {
            await gateAPI.update(editGate._id, form);
            toast.success('Gate updated');
        } else {
            await gateAPI.create(form);
            toast.success('Gate created');
        }
        setModalOpen(false);
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
        setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
        await gateAPI.delete(id);
        toast.success('Gate deleted');
        setDeleteId(null);
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleAssign = async () => {
        if (!selectedFlight) return toast.error('Please select a flight');
        try {
        await gateAPI.assignFlight(assignGateId, selectedFlight);
        toast.success('Flight assigned to gate');
        setAssignGateId(null);
        setSelectedFlight('');
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Assignment failed');
        }
    };

    const handleUnassign = async (id) => {
        try {
        await gateAPI.unassignFlight(id);
        toast.success('Gate freed up');
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Unassign failed');
        }
    };

    // Available flights = those with status not Departed/Arrived/Cancelled
    const assignableFlights = flights.filter((f) =>
        !['Departed', 'Arrived', 'Cancelled'].includes(f.status)
    );

    return (
        <div>
        <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <h1 className="page-title">▣ Gate Management</h1>
                <p className="page-subtitle">{gates.length} gate(s) — {gates.filter((g) => g.status === 'Available').length} available</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select className="form-control" style={{ width: 160 }}
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {GATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <RoleGuard roles={['admin']}>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Gate</button>
                </RoleGuard>
            </div>
            </div>
        </div>

        {/* Gate Cards Grid */}
        {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading gates...</span></div>
        ) : gates.length === 0 ? (
            <div className="card">
            <div className="empty-state">
                <div className="empty-icon">▣</div>
                <p>No gates found. Add one to get started.</p>
            </div>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {gates.map((g) => (
                <div key={g._id} className="card" style={{ padding: 20 }}>
                {/* Gate Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#f0f4ff' }}>
                        {g.gateNumber}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Terminal {g.terminal}
                    </div>
                    </div>
                    <GateStatusBadge status={g.status} />
                </div>

                {/* Assigned Flight */}
                <div style={{ marginBottom: 16, minHeight: 50 }}>
                    {g.assignedFlight ? (
                    <div style={{
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        borderRadius: 8, padding: '10px 12px',
                    }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>
                        ✈ {g.assignedFlight.flightNumber}
                        </div>
                        <div style={{ fontSize: 11, color: '#4a6080', marginTop: 3 }}>
                        {g.assignedFlight.origin} → {g.assignedFlight.destination}
                        </div>
                        <div style={{ marginTop: 6 }}>
                        <FlightStatusBadge status={g.assignedFlight.status} />
                        </div>
                    </div>
                    ) : (
                    <div style={{ color: '#4a6080', fontSize: 12, fontStyle: 'italic' }}>No flight assigned</div>
                    )}
                </div>

                {/* Capacity */}
                <div style={{ fontSize: 11, color: '#4a6080', marginBottom: 14, fontWeight: 500 }}>
                    Capacity: {g.capacity} seats
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <RoleGuard roles={['admin', 'staff']}>
                    {g.status === 'Available' && (
                        <button className="btn btn-primary btn-sm"
                        onClick={() => { setAssignGateId(g._id); setSelectedFlight(''); }}>
                        Assign Flight
                        </button>
                    )}
                    </RoleGuard>
                    <RoleGuard roles={['admin', 'staff']}>
                    {g.assignedFlight && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUnassign(g._id)}>
                        Unassign
                        </button>
                    )}
                    </RoleGuard>
                    <RoleGuard roles={['admin', 'staff']}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}>Edit</button>
                    </RoleGuard>
                    <RoleGuard roles={['admin']}>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(g._id)}>Del</button>
                    </RoleGuard>
                </div>
                </div>
            ))}
            </div>
        )}

        {/* Create / Edit Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
            title={editGate ? `Edit Gate ${editGate.gateNumber}` : 'Add New Gate'}>
            <form onSubmit={handleSubmit}>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Gate Number</label>
                <input name="gateNumber" className="form-control" placeholder="A1"
                    value={form.gateNumber} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Terminal</label>
                <input name="terminal" className="form-control" placeholder="T1"
                    value={form.terminal} onChange={handleChange} required />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                    {GATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Capacity</label>
                <input name="capacity" type="number" className="form-control" min={1}
                    value={form.capacity} onChange={handleChange} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Saving...</> : (editGate ? 'Update Gate' : 'Create Gate')}
                </button>
            </div>
            </form>
        </Modal>

        {/* Assign Flight Modal */}
        <Modal isOpen={!!assignGateId} onClose={() => setAssignGateId(null)} title="Assign Flight to Gate">
            <p style={{ fontSize: 13, color: '#8899bb', marginBottom: 16 }}>
            Select an active flight to assign to this gate.
            </p>
            <div className="form-group">
            <label className="form-label">Select Flight</label>
            <select className="form-control" value={selectedFlight}
                onChange={(e) => setSelectedFlight(e.target.value)}>
                <option value="">-- Choose Flight --</option>
                {assignableFlights.map((f) => (
                <option key={f._id} value={f._id}>
                    {f.flightNumber} | {f.airline} | {f.origin} → {f.destination} | {f.status}
                </option>
                ))}
            </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setAssignGateId(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedFlight}>
                Assign Flight
            </button>
            </div>
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
            <p style={{ color: '#8899bb', marginBottom: 24 }}>
            Delete this gate permanently? Gates with assigned flights cannot be deleted.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete Gate</button>
            </div>
        </Modal>
        </div>
    );
    }