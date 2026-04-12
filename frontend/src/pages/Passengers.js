    import React, { useState, useEffect, useCallback } from 'react';
    import { toast } from 'react-toastify';
    import { passengerAPI, flightAPI } from '../services/api';
    import Modal from '../components/Modal';
    import RoleGuard from '../components/RoleGuard';
    import { CheckInBadge } from '../components/StatusBadge';

    const emptyForm = {
    firstName: '', lastName: '', email: '',
    passportNumber: '', phone: '', flight: '', seatNumber: '',
    };

    export default function Passengers() {
    const [passengers, setPassengers] = useState([]);
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editPassenger, setEditPassenger] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [checkInId, setCheckInId] = useState(null);
    const [seatInput, setSeatInput] = useState('');
    const [filterCheckedIn, setFilterCheckedIn] = useState('');
    const [filterFlight, setFilterFlight] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
        const params = {};
        if (filterCheckedIn !== '') params.checkedIn = filterCheckedIn;
        if (filterFlight) params.flight = filterFlight;
        const [passRes, flightRes] = await Promise.all([
            passengerAPI.getAll(params),
            flightAPI.getAll(),
        ]);
        setPassengers(passRes.data.data);
        setFlights(flightRes.data.data);
        } catch {
        toast.error('Failed to load data');
        } finally {
        setLoading(false);
        }
    }, [filterCheckedIn, filterFlight]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditPassenger(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setEditPassenger(p);
        setForm({
        firstName: p.firstName, lastName: p.lastName, email: p.email,
        passportNumber: p.passportNumber, phone: p.phone || '',
        flight: p.flight?._id || '', seatNumber: p.seatNumber || '',
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
        if (editPassenger) {
            await passengerAPI.update(editPassenger._id, form);
            toast.success('Passenger updated');
        } else {
            await passengerAPI.create(form);
            toast.success('Passenger added');
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
        await passengerAPI.delete(id);
        toast.success('Passenger removed');
        setDeleteId(null);
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleCheckIn = async () => {
        try {
        await passengerAPI.checkIn(checkInId, { seatNumber: seatInput });
        toast.success('Passenger checked in! Boarding pass generated.');
        setCheckInId(null);
        setSeatInput('');
        fetchData();
        } catch (err) {
        toast.error(err.response?.data?.message || 'Check-in failed');
        }
    };

    return (
        <div>
        <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <h1 className="page-title">◈ Passenger Management</h1>
                <p className="page-subtitle">{passengers.length} passenger(s) in system</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select className="form-control" style={{ width: 160 }}
                value={filterFlight} onChange={(e) => setFilterFlight(e.target.value)}>
                <option value="">All Flights</option>
                {flights.map((f) => (
                    <option key={f._id} value={f._id}>{f.flightNumber} — {f.origin}→{f.destination}</option>
                ))}
                </select>
                <select className="form-control" style={{ width: 130 }}
                value={filterCheckedIn} onChange={(e) => setFilterCheckedIn(e.target.value)}>
                <option value="">All Status</option>
                <option value="true">Checked In</option>
                <option value="false">Pending</option>
                </select>
                <RoleGuard roles={['admin', 'staff']}>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Passenger</button>
                </RoleGuard>
            </div>
            </div>
        </div>

        <div className="card">
            {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading passengers...</span></div>
            ) : passengers.length === 0 ? (
            <div className="empty-state">
                <div className="empty-icon">◈</div>
                <p>No passengers found. Add one to get started.</p>
            </div>
            ) : (
            <div className="table-wrapper">
                <table className="data-table">
                <thead>
                    <tr>
                    <th>Name</th>
                    <th>Passport</th>
                    <th>Email</th>
                    <th>Flight</th>
                    <th>Seat</th>
                    <th>Check-in</th>
                    <th>Boarding Pass</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {passengers.map((p) => (
                    <tr key={p._id}>
                        <td><strong>{p.firstName} {p.lastName}</strong></td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{p.passportNumber}</span></td>
                        <td style={{ fontSize: 12 }}>{p.email}</td>
                        <td>
                        {p.flight ? (
                            <span className="mono" style={{ fontSize: 12, color: '#3b82f6' }}>
                            {p.flight.flightNumber}
                            </span>
                        ) : '—'}
                        </td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{p.seatNumber || '—'}</span></td>
                        <td><CheckInBadge checkedIn={p.checkedIn} /></td>
                        <td>
                        {p.boardingPass ? (
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#10b981' }}>
                            {p.boardingPass.slice(0, 20)}...
                            </span>
                        ) : (
                            <span style={{ color: '#4a6080', fontSize: 12 }}>—</span>
                        )}
                        </td>
                        <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <RoleGuard roles={['admin', 'staff']}>
                            {!p.checkedIn && (
                                <button className="btn btn-success btn-sm"
                                onClick={() => { setCheckInId(p._id); setSeatInput(p.seatNumber || ''); }}>
                                Check-In
                                </button>
                            )}
                            </RoleGuard>
                            <RoleGuard roles={['admin', 'staff']}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                            </RoleGuard>
                            <RoleGuard roles={['admin']}>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p._id)}>Del</button>
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

        {/* Add / Edit Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
            title={editPassenger ? `Edit — ${editPassenger.firstName} ${editPassenger.lastName}` : 'Add New Passenger'}>
            <form onSubmit={handleSubmit}>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">First Name</label>
                <input name="firstName" className="form-control" placeholder="John"
                    value={form.firstName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Last Name</label>
                <input name="lastName" className="form-control" placeholder="Smith"
                    value={form.lastName} onChange={handleChange} required />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-control" placeholder="john@example.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Passport Number</label>
                <input name="passportNumber" className="form-control" placeholder="A1234567"
                    value={form.passportNumber} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label className="form-label">Phone</label>
                <input name="phone" className="form-control" placeholder="+91-9999999999"
                    value={form.phone} onChange={handleChange} />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                <label className="form-label">Assign Flight</label>
                <select name="flight" className="form-control" value={form.flight} onChange={handleChange} required>
                    <option value="">Select Flight</option>
                    {flights.map((f) => (
                    <option key={f._id} value={f._id}>
                        {f.flightNumber} — {f.origin} → {f.destination}
                    </option>
                    ))}
                </select>
                </div>
                <div className="form-group">
                <label className="form-label">Seat Number</label>
                <input name="seatNumber" className="form-control" placeholder="12A"
                    value={form.seatNumber} onChange={handleChange} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Saving...</> : (editPassenger ? 'Update' : 'Add Passenger')}
                </button>
            </div>
            </form>
        </Modal>

        {/* Check-In Modal */}
        <Modal isOpen={!!checkInId} onClose={() => setCheckInId(null)} title="Passenger Check-In">
            <p style={{ color: '#8899bb', marginBottom: 16, fontSize: 13 }}>
            Confirm check-in. A boarding pass will be generated automatically.
            </p>
            <div className="form-group">
            <label className="form-label">Seat Number (optional)</label>
            <input className="form-control" placeholder="e.g. 14B"
                value={seatInput} onChange={(e) => setSeatInput(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setCheckInId(null)}>Cancel</button>
            <button className="btn btn-success" onClick={handleCheckIn}>✓ Confirm Check-In</button>
            </div>
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
            <p style={{ color: '#8899bb', marginBottom: 24 }}>Remove this passenger from the system?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Remove Passenger</button>
            </div>
        </Modal>
        </div>
    );
    }