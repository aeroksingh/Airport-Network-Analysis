import React, { useState, useEffect, useCallback } from 'react';
import api, { adminAPI } from '../services/api';
import useTowerSocket from '../hooks/useTowerSocket';
import { useAuth } from '../App';
import { toast } from 'react-toastify';

function fmtDT(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
const RC={admin:{bg:'rgba(239,68,68,0.15)',color:'#ef4444',border:'rgba(239,68,68,0.3)'},staff:{bg:'rgba(59,130,246,0.15)',color:'#3b82f6',border:'rgba(59,130,246,0.3)'},viewer:{bg:'rgba(16,185,129,0.15)',color:'#10b981',border:'rgba(16,185,129,0.3)'}};
const AC={USER_CREATED:'#8b5cf6',USER_REMOVED:'#ef4444',USER_ROLE_CHANGED:'#f59e0b',FILE_SENT:'#10b981',FILE_UPLOADED:'#3b82f6',NETWORK_CONTROL:'#f59e0b'};

function AddModal({onClose,onAdded}){
  const [f,setF]=useState({name:'',email:'',password:'',role:'staff',state:'',city:''});
  const [loading,setL]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=async()=>{
    if(!f.name||!f.email||!f.password) return toast.warn('Name, email and password required');
    setL(true);
    try{ await api.post('/admin/users',f); toast.success(`Node ${f.name} added`); onAdded(); onClose(); }
    catch(e){ toast.error(e.response?.data?.message||'Failed'); }
    finally{ setL(false); }
  };
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">⚙ ADD NETWORK NODE</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="form-row" style={{marginBottom:14}}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="John Doe"/></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={f.email} onChange={e=>set('email',e.target.value)} placeholder="user@airtower.net"/></div>
        </div>
        <div className="form-group" style={{marginBottom:14}}><label className="form-label">Password</label><input className="form-control" type="password" value={f.password} onChange={e=>set('password',e.target.value)} placeholder="Min 6 characters"/></div>
        <div className="form-row" style={{marginBottom:14}}>
          <div className="form-group"><label className="form-label">State / Region</label><input className="form-control" value={f.state} onChange={e=>set('state',e.target.value)} placeholder="Maharashtra"/></div>
          <div className="form-group"><label className="form-label">City / Node</label><input className="form-control" value={f.city} onChange={e=>set('city',e.target.value)} placeholder="Mumbai"/></div>
        </div>
        <div className="form-group" style={{marginBottom:20}}>
          <label className="form-label">Network Role</label>
          <select className="form-control" value={f.role} onChange={e=>set('role',e.target.value)}>
            <option value="staff">Staff — Standard access</option>
            <option value="viewer">Viewer — Read-only</option>
            <option value="admin">Admin — Full control</option>
          </select>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading?<span className="spinner" style={{width:14,height:14}}/>:null} ✚ ADD NODE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel(){
  const {user,token}=useAuth();
  const {connected,logEvents,adminActions,onlineUsers}=useTowerSocket({userId:user?.id,userName:user?.name,userRole:user?.role,token});
  const [users,setUsers]=useState([]);
  const [logs,setLogs]=useState([]);
  const [showAdd,setAdd]=useState(false);
  const [loadU,setLU]=useState(false);
  const [delC,setDC]=useState(null);

  const fetchUsers=useCallback(async()=>{setLU(true);try{const r=await api.get('/admin/users');setUsers(r.data?.data||[]);}catch(e){toast.error('Failed to fetch users');}finally{setLU(false);}}, []);
  const fetchLogs=useCallback(async()=>{try{const r=await api.get('/admin/logs');setLogs(r.data?.data||[]);}catch{}}, []);

  useEffect(()=>{fetchUsers();fetchLogs();const t=setInterval(fetchLogs,15000);return()=>clearInterval(t);},[fetchUsers,fetchLogs]);
  useEffect(()=>{if(adminActions.length)fetchUsers();},[adminActions,fetchUsers]);

  const handleDelete=async(id)=>{try{await api.delete(`/admin/users/${id}`);toast.success('Node removed');setDC(null);fetchUsers();}catch(e){toast.error(e.response?.data?.message||'Delete failed');}};
  const handleRole=async(id,role)=>{try{await api.patch(`/admin/users/${id}/role`,{role});toast.success(`Role → ${role}`);fetchUsers();}catch{toast.error('Role update failed');}};

  const allLogs=[
    ...logEvents.map(e=>({_live:true,action:e.event||e.action||e.type,performedBy:{name:e.adminName||e.senderName||'—'},timestamp:e.timestamp,metadata:{}})),
    ...logs,
  ].slice(0,200);

  return(
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div>
            <h1 className="page-title">⚙ ADMIN CONSOLE — AIR TOWER</h1>
            <p className="page-subtitle" style={{fontFamily:"'Space Mono',monospace",fontSize:10,letterSpacing:'0.06em'}}>
              OPERATOR: {user?.name?.toUpperCase()} &nbsp;|&nbsp;
              <span style={{color:connected?'#10b981':'#ef4444'}}>{connected?`● HUB ONLINE · ${onlineUsers.length} NODES`:'○ HUB OFFLINE'}</span>
            </p>
          </div>
          <button className="btn btn-primary" onClick={()=>setAdd(true)}>✚ ADD NODE</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        {[
          {label:'Total Nodes',value:users.length,color:'#3b82f6',icon:'◉'},
          {label:'Online Now',value:onlineUsers.length,color:'#10b981',icon:'●'},
          {label:'Admin Nodes',value:users.filter(u=>u.role==='admin').length,color:'#ef4444',icon:'⚙'},
          {label:'Log Events',value:logs.length,color:'#8b5cf6',icon:'📋'},
        ].map(s=>(
          <div className="stat-card" key={s.label} style={{borderTop:`2px solid ${s.color}30`}}>
            <div style={{fontSize:18,color:s.color,marginBottom:8}}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color:s.color,fontSize:24}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:16}}>
        {/* Users table */}
        <div className="card">
          <div className="card-header">
            <h2 style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:'#f0f4ff',letterSpacing:'0.06em'}}>◉ NETWORK NODES</h2>
            <button onClick={fetchUsers} style={{fontFamily:"'Space Mono',monospace",fontSize:12,background:'rgba(255,255,255,0.04)',border:'1px solid #1e2d45',color:'#8899bb',borderRadius:6,padding:'5px 12px',cursor:'pointer'}}>↺ REFRESH</button>
          </div>
          {loadU?<div className="loading-screen"><div className="spinner"/></div>:(
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>NODE / USER</th><th>LOCATION</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {users.map(u=>{
                    const rc=RC[u.role]||RC.viewer;
                    const online=onlineUsers.includes(String(u._id));
                    const self=u._id===user?.id;
                    const confirming=delC===u._id;
                    return(
                      <tr key={u._id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{u.name.charAt(0).toUpperCase()}</div>
                            <div><div style={{fontWeight:600,color:'#f0f4ff',fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:'#4a6080',fontFamily:"'Space Mono',monospace"}}>{u.email}</div></div>
                          </div>
                        </td>
                        <td style={{fontSize:12,color:'#8899bb'}}>{u.city||''}{u.city&&u.state&&', '}{u.state||''}{!u.city&&!u.state&&'—'}</td>
                        <td>
                          {self?(<span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4,background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`}}>{u.role}</span>):(
                            <select value={u.role} onChange={e=>handleRole(u._id,e.target.value)}
                              style={{fontFamily:"'Space Mono',monospace",fontSize:10,background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`,borderRadius:4,padding:'3px 6px',cursor:'pointer',outline:'none'}}>
                              <option value="admin">admin</option>
                              <option value="staff">staff</option>
                              <option value="viewer">viewer</option>
                            </select>
                          )}
                        </td>
                        <td><div style={{display:'flex',alignItems:'center',gap:5}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:online?'#10b981':'#4a6080',flexShrink:0}}/>
                          <span style={{fontSize:11,fontFamily:"'Space Mono',monospace",color:online?'#10b981':'#4a6080'}}>{online?'ONLINE':'OFFLINE'}</span>
                        </div></td>
                        <td>
                          {!self&&(confirming?(
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>handleDelete(u._id)} style={{padding:'4px 10px',background:'rgba(239,68,68,0.2)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.4)',borderRadius:5,fontSize:11,cursor:'pointer',fontWeight:700}}>CONFIRM</button>
                              <button onClick={()=>setDC(null)} style={{padding:'4px 8px',background:'rgba(255,255,255,0.05)',color:'#8899bb',border:'1px solid #1e2d45',borderRadius:5,fontSize:11,cursor:'pointer'}}>✕</button>
                            </div>
                          ):(
                            <button onClick={()=>setDC(u._id)} style={{padding:'5px 10px',background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:"'Space Mono',monospace",letterSpacing:1}}>✕ REMOVE</button>
                          ))}
                          {self&&<span style={{fontSize:11,color:'#4a6080',fontFamily:"'Space Mono',monospace"}}>YOU</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="card" style={{display:'flex',flexDirection:'column'}}>
          <div className="card-header">
            <h2 style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:'#f0f4ff',letterSpacing:'0.06em'}}>📋 ACTIVITY LOG</h2>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block',animation:'pulse 2s ease infinite'}}/>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'#4a6080',letterSpacing:'0.06em'}}>LIVE</span>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',maxHeight:500,display:'flex',flexDirection:'column',gap:4}}>
            {allLogs.length===0?<div style={{textAlign:'center',padding:'30px 0',color:'#4a6080',fontFamily:"'Space Mono',monospace",fontSize:11}}>NO EVENTS YET</div>
            :allLogs.map((log,i)=>{
              const col=AC[log.action]||'#4a6080';
              return(
                <div key={i} style={{padding:'7px 10px',borderLeft:`2px solid ${col}`,background:log._live?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.02)',borderRadius:'0 6px 6px 0'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:3,background:`${col}20`,color:col,letterSpacing:'0.05em'}}>{log.action}</span>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'#4a6080'}}>{fmtTime(log.timestamp)}</span>
                    {log._live&&<span style={{fontSize:8,color:'#10b981',fontFamily:"'Space Mono',monospace"}}>● LIVE</span>}
                  </div>
                  <div style={{fontSize:12,color:'#8899bb'}}>
                    <strong style={{color:'#f0f4ff'}}>{log.performedBy?.name||'System'}</strong>
                    {log.metadata?.targetEmail&&<span> → {log.metadata.targetEmail}</span>}
                    {log.metadata?.removedUserEmail&&<span style={{color:'#ef4444'}}> → {log.metadata.removedUserEmail}</span>}
                    {log.metadata?.newRole&&<span style={{color:'#f59e0b'}}> [{log.metadata.newRole}]</span>}
                    {log.metadata?.originalName&&<span style={{color:'#06b6d4'}}> [{log.metadata.originalName}]</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd&&<AddModal onClose={()=>setAdd(false)} onAdded={fetchUsers}/>}
    </div>
  );
}
