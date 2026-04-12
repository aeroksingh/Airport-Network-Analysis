import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { useAuth } from '../App';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.login({ email, password });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check backend is running on port 5000.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.left}>
        <div>
          <div style={S.heroIcon}>✈</div>
          <h1 style={S.heroTitle}>AIR TOWER</h1>
          <p style={S.heroSub}>NETWORK CONTROL SYSTEM</p>
          <div style={S.heroDivider} />
          <p style={S.heroDesc}>Real-time file transfer, node management, and network control from a unified command interface.</p>
          <div style={S.stats}>
            {['FLIGHTS','GATES','PASSENGERS'].map(l => (
              <div key={l} style={S.stat}><div style={S.statV}>∞</div><div style={S.statL}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div style={S.right}>
        <div style={S.box}>
          <h2 style={S.title}>Sign In</h2>
          <p style={S.sub}>Enter your credentials to access the system</p>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">EMAIL ADDRESS</label>
              <input type="email" className="form-control" placeholder="admin@airport.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">PASSWORD</label>
              <input type="password" className="form-control" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
              disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <p style={S.link}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600 }}>Register here</Link>
          </p>
          <p style={S.link}>
            <Link to="/setup" style={{ color: '#4a6080', fontSize: 12 }}>🔑 First time setup? Create admin account</Link>
          </p>

          <div style={S.demo}>
            <div style={S.demoTitle}>DEMO CREDENTIALS</div>
            <div style={S.demoRow}>Email: <span style={S.demoVal}>admin@airport.com</span></div>
            <div style={S.demoRow}>Password: <span style={S.demoVal}>admin123</span></div>
            <div style={{ fontSize: 10, color: '#4a6080', marginTop: 6 }}>
              Run <code>node backend/scripts/seedAdmin.js</code> first if not set up
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:     { display: 'flex', minHeight: '100vh', background: '#0a0e1a' },
  left:     { flex: 1, background: 'linear-gradient(160deg,#0d1628,#0a0e1a)', borderRight: '1px solid #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 },
  heroIcon: { fontSize: 48, marginBottom: 16, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroTitle:{ fontFamily: "'Space Mono',monospace", fontSize: 40, fontWeight: 700, color: '#f0f4ff', letterSpacing: -2, lineHeight: 1, marginBottom: 8 },
  heroSub:  { fontSize: 11, color: '#4a6080', letterSpacing: '0.15em', marginBottom: 24 },
  heroDivider: { width: 40, height: 2, background: 'linear-gradient(90deg,#3b82f6,transparent)', marginBottom: 24 },
  heroDesc: { color: '#8899bb', fontSize: 14, lineHeight: 1.7, maxWidth: 360, marginBottom: 40 },
  stats:    { display: 'flex', gap: 32 },
  stat:     { textAlign: 'center' },
  statV:    { fontFamily: "'Space Mono',monospace", fontSize: 22, color: '#3b82f6', fontWeight: 700 },
  statL:    { fontSize: 9, color: '#4a6080', letterSpacing: '0.1em', marginTop: 4 },
  right:    { width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  box:      { width: '100%', maxWidth: 380 },
  title:    { fontFamily: "'Space Mono',monospace", fontSize: 26, color: '#f0f4ff', fontWeight: 700, marginBottom: 6 },
  sub:      { fontSize: 13, color: '#4a6080', marginBottom: 24 },
  link:     { textAlign: 'center', marginTop: 14, fontSize: 13, color: '#4a6080' },
  demo:     { marginTop: 24, padding: 14, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8 },
  demoTitle:{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 },
  demoRow:  { fontSize: 12, color: '#8899bb', marginBottom: 4 },
  demoVal:  { color: '#3b82f6', fontFamily: "'Space Mono',monospace" },
};
