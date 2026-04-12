import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { useAuth } from '../App';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

export default function Register() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [state,   setState]   = useState('');
  const [city,    setCity]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state)       return setError('Please select a state');
    if (!city.trim()) return setError('Please enter a city');
    setLoading(true); setError('');
    try {
      // Note: role is NOT sent — backend always assigns 'staff' to new registrations
      const res = await authAPI.register({ ...form, state, city });
      login(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.name}! Account created.`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Check the backend is running.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.left}>
        <div style={S.heroContent}>
          <div style={S.heroIcon}>✈</div>
          <h1 style={S.heroTitle}>AeroControl</h1>
          <p style={S.heroSubtitle}>Airport Management System</p>
          <div style={S.heroDivider} />
          <p style={S.heroDesc}>Manage flights, passengers, and gate assignments from a unified control panel.</p>
          <div style={S.stats}>
            {[{label:'Flights',val:'∞'},{label:'Gates',val:'∞'},{label:'Passengers',val:'∞'}].map(s=>(
              <div key={s.label} style={S.statItem}>
                <div style={S.statVal}>{s.val}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={S.right}>
        <div style={S.formBox}>
          <div style={S.formHeader}>
            <h2 style={S.formTitle}>Create Account</h2>
            <p style={S.formSubtitle}>Register to access the airport management system</p>
          </div>

          {error && <div className="alert alert-error" style={{marginBottom:16}}>⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="form-control" placeholder="Your name"
                value={form.name} onChange={handleChange} required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-control" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-control" placeholder="Min 6 characters"
                value={form.password} onChange={handleChange} required minLength={6} />
            </div>

            {/* Role removed — all new users are Staff. Admin promotes via Admin Panel. */}
            <div className="form-group">
              <label className="form-label">Default Role</label>
              <input type="text" className="form-control" value="Staff (Pending Admin Approval)" disabled
                style={{opacity:0.6,cursor:'not-allowed'}} />
              <small style={{fontSize:11,color:'#4a6080',marginTop:4,display:'block'}}>
                Note: All new accounts are registered as Staff by default.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">State</label>
              <select name="state" className="form-control" value={state} onChange={e=>setState(e.target.value)} required>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input type="text" name="city" className="form-control" placeholder="Enter your city"
                value={city} onChange={e=>setCity(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',marginTop:8,padding:'12px'}}
              disabled={loading}>
              {loading ? <><span className="spinner" /> Creating Account...</> : 'Create Account →'}
            </button>
          </form>

          <p style={S.switchLink}>
            Already have an account?{' '}
            <Link to="/login" style={{color:'#3b82f6',textDecoration:'none',fontWeight:600}}>Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:      {display:'flex',minHeight:'100vh',background:'#0a0e1a'},
  left:      {flex:1,background:'linear-gradient(160deg,#0d1628 0%,#0a0e1a 60%,#071020 100%)',borderRight:'1px solid #1e2d45',display:'flex',alignItems:'center',justifyContent:'center',padding:60},
  heroContent:{maxWidth:380},
  heroIcon:  {fontSize:48,marginBottom:20,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  heroTitle: {fontFamily:"'Space Mono',monospace",fontSize:38,fontWeight:700,color:'#f0f4ff',letterSpacing:'-2px',lineHeight:1,marginBottom:10},
  heroSubtitle:{fontSize:14,color:'#4a6080',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:28},
  heroDivider:{width:40,height:2,background:'linear-gradient(90deg,#3b82f6,transparent)',marginBottom:28},
  heroDesc:  {color:'#8899bb',fontSize:14,lineHeight:1.7,marginBottom:40},
  stats:     {display:'flex',gap:32},
  statItem:  {textAlign:'center'},
  statVal:   {fontFamily:"'Space Mono',monospace",fontSize:22,color:'#3b82f6',fontWeight:700},
  statLabel: {fontSize:10,color:'#4a6080',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginTop:4},
  right:     {width:460,display:'flex',alignItems:'center',justifyContent:'center',padding:48},
  formBox:   {width:'100%',maxWidth:380},
  formHeader:{marginBottom:28},
  formTitle: {fontFamily:"'Space Mono',monospace",fontSize:24,fontWeight:700,color:'#f0f4ff',letterSpacing:'-0.5px',marginBottom:6},
  formSubtitle:{fontSize:13,color:'#4a6080'},
  switchLink:{textAlign:'center',marginTop:20,fontSize:13,color:'#4a6080'},
};
