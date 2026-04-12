import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

export default function Setup() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.setup(form);
      toast.success('Admin account created! Please log in.');
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Setup failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.header}>
          <div style={S.icon}>✈</div>
          <h2 style={S.title}>First Time Setup</h2>
          <p style={S.sub}>Create your admin account to get started.<br/>This can only be done once.</p>
        </div>

        {done ? (
          <div style={{textAlign:'center',padding:'30px 0',color:'#10b981',fontSize:15,fontWeight:600}}>
            ✅ Setup complete! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="name" className="form-control" placeholder="Airport Admin"
                value={form.name} onChange={handleChange} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control"
                placeholder="admin@airport.com" value={form.email}
                onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-control"
                placeholder="Min. 6 characters" value={form.password}
                onChange={handleChange} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',padding:'12px',marginTop:8}}
              disabled={loading}>
              {loading ? <><span className="spinner" /> Creating Admin...</> : 'Create Admin Account →'}
            </button>
          </form>
        )}

        <p style={S.link}>
          Already set up?{' '}
          <Link to="/login" style={{color:'#3b82f6',textDecoration:'none',fontWeight:600}}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const S = {
  page:   {minHeight:'100vh',background:'#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center',padding:24},
  box:    {width:'100%',maxWidth:400,background:'#161d2e',border:'1px solid #1e2d45',borderRadius:16,padding:40},
  header: {textAlign:'center',marginBottom:28},
  icon:   {fontSize:36,marginBottom:14,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  title:  {fontFamily:"'Space Mono',monospace",fontSize:22,color:'#f0f4ff',fontWeight:700,marginBottom:6},
  sub:    {fontSize:13,color:'#4a6080',lineHeight:1.6},
  link:   {textAlign:'center',marginTop:20,fontSize:13,color:'#4a6080'},
};
