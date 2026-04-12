import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import api, { userAPI, fileAPI, API_URL } from '../services/api';
import useTowerSocket from '../hooks/useTowerSocket';
import { toast } from 'react-toastify';

const fmtSz = b => { if (!b) return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(1)} ${s[i]}`; };
const fmtT  = ts => ts ? new Date(ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
const fmtDT = ts => ts ? new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const SIG_COLOR = { GO:'#10b981', STOP:'#ef4444', RESET:'#8b5cf6' };
const EVT_COLOR = { GO:'#10b981', STOP:'#ef4444', RESET:'#8b5cf6', FILE_SENT:'#3b82f6', FILE_UPLOADED:'#06b6d4', FILE_INCOMING:'#06b6d4' };

// Authenticated file download using Bearer token
function DlBtn({ url, name, token, style, children }) {
  const go = async () => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_URL.replace('/api','')}${url}`;
      const r = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { toast.error(`Download failed: ${r.status}`); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await r.blob());
      a.download = name; a.click();
      URL.revokeObjectURL(a.href);
    } catch(e) { toast.error(e.message); }
  };
  return <button onClick={go} style={style}>{children}</button>;
}

function NetControl({ user, users, sendNetworkControl, networkSignal, onLog }) {
  const [state,   setState]  = useState(null);
  const [target,  setTarget] = useState('');
  const [stopped, setStopped] = useState(false);
  const clickRef = useRef(null);

  useEffect(() => { if (networkSignal) setState(networkSignal.signal === 'RESET' ? null : networkSignal.signal); }, [networkSignal]);

  const fire = (sig) => {
    sendNetworkControl(sig, target || null);
    const tName = target ? (users.find(u => u._id === target)?.name || '?') : 'ALL';
    onLog({ event: sig, signal: sig, senderName: user?.name, isBroadcast: !target, targetName: target ? tName : null, timestamp: new Date().toISOString() });
    if (sig === 'GO')   { setState('GO');   setStopped(false); toast.success(`🟢 GO → ${tName}`); }
    if (sig === 'STOP') { setState('STOP'); setStopped(false); toast.error(`🔴 STOP → ${tName}`); }
    if (sig === 'RESET'){ setState(null);   setStopped(true);  setTimeout(()=>setStopped(false),4000); toast.info('⚪ Process stopped'); }
  };

  const click = (sig) => {
    if (clickRef.current) return;
    clickRef.current = setTimeout(() => { clickRef.current = null; fire(sig); }, 260);
  };
  const dbl = () => { clearTimeout(clickRef.current); clickRef.current = null; fire('RESET'); };

  return (
    <div style={S.panel}>
      <div style={S.ph}><span style={S.pt}>⚡ NETWORK CONTROL</span><span style={S.ps}>click=activate · double-click=reset</span></div>
      <select value={target} onChange={e=>setTarget(e.target.value)} style={{width:'100%',padding:'7px 10px',background:'#0d1526',border:'1px solid #1e2d45',borderRadius:7,color:'#8899bb',fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:14}}>
        <option value="">📡 Broadcast to ALL</option>
        {users.map(u=><option key={u._id} value={u._id}>👤 {u.name} [{u.role}]</option>)}
      </select>
      {stopped && (
        <div style={{background:'rgba(139,85,198,0.15)',border:'1px solid rgba(139,85,198,0.4)',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:15}}>⚪</span>
          <div><div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:'#8b5cf6'}}>PROCESS STOPPED</div>
          <div style={{fontSize:11,color:'#8899bb'}}>by {user?.name} · {fmtT(new Date())}</div></div>
        </div>
      )}
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        {['GO','STOP'].map(sig => {
          const c = SIG_COLOR[sig], active = state===sig;
          return (
            <button key={sig} onClick={()=>click(sig)} onDoubleClick={dbl}
              style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderRadius:10,cursor:'pointer',fontFamily:"'Space Mono',monospace",minWidth:100,
                background:active?`rgba(${sig==='GO'?'16,185,129':'239,68,68'},0.25)`:`rgba(${sig==='GO'?'16,185,129':'239,68,68'},0.1)`,
                border:`2px solid ${active?c:`rgba(${sig==='GO'?'16,185,129':'239,68,68'},0.3)`}`,color:c,
                boxShadow:active?`0 0 20px ${c}55`:'none',transform:active?'scale(1.03)':'scale(1)',transition:'all 0.2s'}}>
              <span style={{fontSize:20}}>{sig==='GO'?'🟢':'🔴'}</span>
              <div><div style={{fontSize:16,fontWeight:700,letterSpacing:3}}>{sig}</div>
              <div style={{fontSize:9,opacity:0.7}}>{active?'ACTIVE':'TRANSMIT'}</div></div>
            </button>
          );
        })}
        {networkSignal && (
          <div style={{flex:1,background:'rgba(0,0,0,0.25)',border:'1px solid #1e2d45',borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:9,color:'#4a6080',fontFamily:"'Space Mono',monospace",marginBottom:3}}>LAST SIGNAL</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:15}}>{networkSignal.signal==='GO'?'🟢':networkSignal.signal==='RESET'?'⚪':'🔴'}</span>
              <div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:SIG_COLOR[networkSignal.signal]||'#8899bb'}}>
                  {networkSignal.signal==='RESET'?'STOPPED':networkSignal.signal}
                </div>
                <div style={{fontSize:10,color:'#8899bb'}}>by {networkSignal.senderName} · {fmtT(networkSignal.timestamp)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{marginTop:10,fontSize:10,color:'#4a6080',fontFamily:"'Space Mono',monospace"}}>
        STATE: <span style={{color:SIG_COLOR[state]||'#8899bb',fontWeight:700}}>{state||'IDLE'}</span>
        &nbsp;·&nbsp;TARGET: <span style={{color:'#06b6d4'}}>{target?(users.find(u=>u._id===target)?.name||'?'):'ALL'}</span>
      </div>
    </div>
  );
}

function LiveLog({ logs, token }) {
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.scrollTop=0; },[logs]);

  const download = async fmt => {
    try {
      const url = `${API_URL}/logs/download?format=${fmt}`;
      const r   = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } });
      if (!r.ok){ toast.error('Log download failed'); return; }
      const a   = document.createElement('a');
      a.href    = URL.createObjectURL(await r.blob());
      a.download= `logs.${fmt}`; a.click();
      URL.revokeObjectURL(a.href);
    } catch(e){ toast.error(e.message); }
  };

  return (
    <div style={{...S.panel,display:'flex',flexDirection:'column'}}>
      <div style={{...S.ph,marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={S.pt}>📋 LIVE LOG</span>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block'}}/>
          <span style={{fontSize:10,color:'#4a6080'}}>{logs.length} events</span>
        </div>
        <div style={{display:'flex',gap:5}}>
          <button onClick={()=>download('json')} style={S.dlBtn}>⬇ JSON</button>
          <button onClick={()=>download('txt')}  style={S.dlBtn}>⬇ TXT</button>
        </div>
      </div>
      <div ref={ref} style={{flex:1,minHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
        {logs.length===0
          ? <div style={{color:'#4a6080',fontFamily:"'Space Mono',monospace",fontSize:10,textAlign:'center',padding:'30px 0'}}>AWAITING EVENTS...</div>
          : logs.map((ev,i)=>{
            const k = ev.event||ev.action||ev.type||'';
            const c = EVT_COLOR[k]||'#4a6080';
            return (
              <div key={i} style={{padding:'5px 9px',borderLeft:`3px solid ${c}`,background:`${c}08`,borderRadius:'0 5px 5px 0'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:`${c}20`,color:c}}>
                    {k==='RESET'?'STOPPED':k}
                  </span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'#4a6080'}}>{fmtT(ev.timestamp)}</span>
                </div>
                <div style={{fontSize:11,color:'#8899bb',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {ev.senderName && <span style={{color:'#60a5fa',fontWeight:500}}>{ev.senderName}</span>}
                  {(ev.isBroadcast!==undefined||ev.targetName) && <span style={{color:'#4a6080'}}>→</span>}
                  {ev.isBroadcast!==undefined && <span style={{color:ev.isBroadcast?'#06b6d4':'#8b5cf6'}}>{ev.isBroadcast||!ev.targetName?'ALL':ev.targetName}</span>}
                  {ev.fileName && <span style={{color:'#f0f4ff'}}>[{ev.fileName}]</span>}
                  {ev.receiverName && !ev.isBroadcast && <span style={{color:'#06b6d4'}}>{ev.receiverName}</span>}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

export default function FileSharing() {
  const { user, token } = useAuth();
  const { connected, networkSignal, incomingFiles, logEvents, sendNetworkControl } =
    useTowerSocket({ userId: user?.id, userName: user?.name, userRole: user?.role, token });

  const [localLogs,   setLocalLogs]   = useState([]);
  const [users,       setUsers]       = useState([]);
  const [recvUserId,  setRecvUserId]  = useState('');
  const [file,        setFile]        = useState(null);
  const [sent,        setSent]        = useState([]);
  const [received,    setReceived]    = useState([]);
  const [pendingId,   setPending]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [dismissed,   setDismissed]   = useState([]);
  const fileRef = useRef(null);

  const addLog = useCallback(e => setLocalLogs(p => [e, ...p].slice(0,50)), []);

  // Merge WS log events into local log
  useEffect(() => {
    if (!logEvents.length) return;
    const e = logEvents[0];
    setLocalLogs(p => { if (p.length && p[0].timestamp===e.timestamp && p[0].event===e.event) return p; return [e,...p].slice(0,50); });
  }, [logEvents]);

  // WS incoming file → received list
  useEffect(() => {
    if (!incomingFiles.length) return;
    const f = incomingFiles[0];
    if (dismissed.includes(f.fileId)) return;
    toast.info(`📥 ${f.fileName} from ${f.senderName}`);
    setReceived(p => p.find(x=>x._id===f.fileId||x._wsId===f.fileId) ? p : [{
      _wsId:f.fileId, _id:f.fileId, originalName:f.fileName, size:f.fileSize,
      mimeType:f.mimeType, downloadUrl:f.downloadUrl,
      senderUserId:{name:f.senderName}, sentAt:f.timestamp,
    },...p].slice(0,50));
    addLog({ event:'FILE_INCOMING', senderName:f.senderName, fileName:f.fileName, timestamp:f.timestamp });
  }, [incomingFiles]); // eslint-disable-line

  const fetchUsers    = useCallback(async()=>{ try{ const r=await userAPI.getAll(); setUsers((r.data?.data||[]).filter(u=>u._id!==user?.id)); }catch{} },[user?.id]);
  const fetchSent     = useCallback(async()=>{ try{ const r=await fileAPI.sent(); setSent((r.data?.data||[]).slice(0,50)); }catch{} },[]);
  const fetchReceived = useCallback(async()=>{ try{
    const r=await fileAPI.received();
    setReceived(p=>{ const ws=p.filter(f=>f._wsId&&!(r.data?.data||[]).find(x=>String(x._id)===f._wsId)); return [...ws,...(r.data?.data||[])].slice(0,50); });
  }catch{} },[]);

  useEffect(()=>{
    fetchUsers(); fetchSent(); fetchReceived();
    const t=setInterval(()=>{ fetchSent(); fetchReceived(); },15000);
    return ()=>clearInterval(t);
  },[fetchUsers,fetchSent,fetchReceived]);

  const handleUpload = async () => {
    if (!file) return toast.warn('Select a file first');
    setLoading(true);
    try {
      const form = new FormData(); form.append('file', file);
      // Use direct fetch with auth header for multipart
      const r = await fetch(`${API_URL}/files/upload`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message||'Upload failed');
      setPending(j.data._id);
      toast.success(`✅ ${file.name} staged`);
      addLog({ event:'FILE_UPLOADED', senderName:user?.name, fileName:file.name, timestamp:new Date().toISOString() });
      setFile(null); if(fileRef.current) fileRef.current.value='';
    } catch(e){ toast.error('Upload: '+e.message); }
    finally{ setLoading(false); }
  };

  const handleSend = async () => {
    if (!pendingId)   return toast.warn('Upload a file first');
    if (!recvUserId)  return toast.warn('Select a receiver');
    setLoading(true);
    try {
      await fileAPI.send({ fileId:pendingId, receiverUserId:recvUserId });
      const rname = users.find(u=>u._id===recvUserId)?.name||'?';
      toast.success('📡 Transmitted');
      addLog({ event:'FILE_SENT', senderName:user?.name, receiverName:rname, timestamp:new Date().toISOString() });
      setPending(null); setRecvUserId(''); fetchSent();
    } catch(e){ toast.error('Send: '+(e.response?.data?.message||e.message)); }
    finally{ setLoading(false); }
  };

  const visible = incomingFiles.filter(f=>!dismissed.includes(f.fileId));
  const rxUser  = users.find(u=>u._id===recvUserId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📡 DATA TRANSFER — AIR TOWER</h1>
        <p className="page-subtitle" style={{fontFamily:"'Space Mono',monospace",fontSize:10}}>
          NODE: {user?.name?.toUpperCase()} &nbsp;|&nbsp; PROTOCOL: WebSocket/RFC-6455 &nbsp;|&nbsp;
          <span style={{color:connected?'#10b981':'#ef4444'}}>{connected?'● CONNECTED':'○ OFFLINE'}</span>
        </p>
      </div>

      {/* Incoming files banner */}
      {visible.length>0 && (
        <div style={{background:'rgba(6,182,212,0.07)',border:'1px solid rgba(6,182,212,0.25)',borderRadius:12,padding:14,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:'#06b6d4'}}>📥 INCOMING — {visible.length}</span>
            <button onClick={()=>setDismissed(incomingFiles.map(f=>f.fileId))} style={{...S.dlBtn,color:'#06b6d4',background:'rgba(6,182,212,0.1)',border:'1px solid rgba(6,182,212,0.2)'}}>CLEAR</button>
          </div>
          {visible.map((f,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'rgba(6,182,212,0.05)',border:'1px solid rgba(6,182,212,0.15)',borderRadius:7,marginBottom:5}}>
              <span style={{fontSize:18}}>{f.mimeType?.includes('image')?'🖼':f.mimeType?.includes('pdf')?'📄':'📦'}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:'#f0f4ff',fontSize:13}}>{f.fileName}</div>
                <div style={{fontSize:11,color:'#8899bb'}}>from <strong style={{color:'#60a5fa'}}>{f.senderName}</strong> · {fmtSz(f.fileSize)} · {fmtT(f.timestamp)}</div>
              </div>
              <DlBtn url={f.downloadUrl} name={f.fileName} token={token}
                style={{fontFamily:"'Space Mono',monospace",fontSize:10,background:'rgba(16,185,129,0.12)',color:'#10b981',border:'1px solid rgba(16,185,129,0.25)',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontWeight:700}}>
                ↓ DOWNLOAD
              </DlBtn>
            </div>
          ))}
        </div>
      )}

      {/* Row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <NetControl user={user} users={users} sendNetworkControl={sendNetworkControl} networkSignal={networkSignal} onLog={addLog}/>
        <LiveLog logs={localLogs} token={token}/>
      </div>

      {/* Row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Transmit */}
        <div style={S.panel}>
          <div style={S.ph}><span style={S.pt}>📤 TRANSMIT FILE</span><span style={S.ps}>Upload → Select → Send</span></div>
          <div style={{display:'flex',gap:10,alignItems:'flex-start',padding:'6px 0'}}>
            <div style={S.sn}>1</div>
            <div style={{flex:1}}>
              <div style={S.sl}>SELECT FILE</div>
              <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 11px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:7,color:'#3b82f6',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                📎 {file?file.name:'Choose file...'}
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>setFile(e.target.files[0]||null)}/>
              </label>
              {file&&<span style={{fontSize:11,color:'#4a6080',display:'block',marginTop:3}}>{fmtSz(file.size)}</span>}
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:6,marginBottom:8}} onClick={handleUpload} disabled={!file||loading}>
            ↑ UPLOAD TO NODE
          </button>
          {pendingId && <div style={{padding:'5px 10px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:6,marginBottom:8,fontSize:12,color:'#10b981'}}>✓ Staged — ID: ...{pendingId.slice(-6)}</div>}
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={S.sn}>2</div>
            <div style={{flex:1}}>
              <div style={S.sl}>SELECT RECEIVER</div>
              <select className="form-control" value={recvUserId} onChange={e=>setRecvUserId(e.target.value)} style={{fontFamily:"'Space Mono',monospace",fontSize:11,marginTop:4}}>
                <option value="">-- Select destination --</option>
                {users.map(u=><option key={u._id} value={u._id}>{u.name} [{u.role}]{u.city?` · ${u.city}`:''}</option>)}
              </select>
              {rxUser&&<div style={{marginTop:5,padding:'4px 9px',background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:6,fontFamily:"'Space Mono',monospace",fontSize:10,color:'#06b6d4'}}>TARGET: {rxUser.name} · {rxUser.city||'N/A'}</div>}
            </div>
          </div>
          <button onClick={handleSend} disabled={!pendingId||!recvUserId||loading}
            style={{width:'100%',marginTop:10,padding:'11px',background:'rgba(6,182,212,0.15)',color:'#06b6d4',border:'1px solid rgba(6,182,212,0.3)',borderRadius:8,fontWeight:700,letterSpacing:2,fontSize:13,cursor:'pointer',opacity:(!pendingId||!recvUserId||loading)?0.45:1}}>
            📡 TRANSMIT TO NODE
          </button>
        </div>

        {/* Sent */}
        <div style={S.panel}>
          <div style={S.ph}><span style={S.pt}>📤 SENT</span><button onClick={fetchSent} style={S.rb}>↺</button></div>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {sent.length===0 ? <div style={S.empty}>No transmissions yet</div>
              : sent.map(f=>(
                <div key={f._id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 0',borderBottom:'1px solid #1e2d45'}}>
                  <span style={{fontSize:16}}>{f.mimeType?.includes('pdf')?'📄':f.mimeType?.includes('image')?'🖼':'📦'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#f0f4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.originalName}</div>
                    <div style={{fontSize:11,color:'#8899bb'}}>→ <strong style={{color:'#06b6d4'}}>{f.receiverUserId?.name||'?'}</strong> · {fmtSz(f.size)} · {fmtDT(f.sentAt||f.createdAt)}</div>
                  </div>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,padding:'2px 7px',borderRadius:4,border:'1px solid',
                    background:f.status==='SENT'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)',
                    color:f.status==='SENT'?'#10b981':'#f59e0b',
                    borderColor:f.status==='SENT'?'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'}}>
                    {f.status}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Received table */}
      <div style={S.panel}>
        <div style={S.ph}>
          <span style={S.pt}>📥 RECEIVED</span>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {visible.length>0&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:9,padding:'2px 8px',borderRadius:4,background:'rgba(6,182,212,0.15)',color:'#06b6d4',border:'1px solid rgba(6,182,212,0.3)'}}>{visible.length} NEW</span>}
            <button onClick={fetchReceived} style={S.rb}>↺</button>
          </div>
        </div>
        {received.length===0 ? <div style={S.empty}>No received files</div> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{borderBottom:'1px solid #1e2d45'}}>
                {['FILE','FROM','SIZE','TIME','ACTION'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:'#4a6080',fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {received.map((f,i)=>(
                  <tr key={f._id||i} style={{borderBottom:'1px solid #1e2d450'}}>
                    <td style={{padding:'8px 10px'}}><div style={{display:'flex',alignItems:'center',gap:7}}>
                      <span style={{fontSize:14}}>{f.mimeType?.includes('pdf')?'📄':f.mimeType?.includes('image')?'🖼':'📦'}</span>
                      <strong style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'#f0f4ff'}}>{f.originalName}</strong>
                    </div></td>
                    <td style={{padding:'8px 10px',color:'#60a5fa'}}>{f.senderUserId?.name||f.senderName||'—'}</td>
                    <td style={{padding:'8px 10px',fontFamily:"'Space Mono',monospace",fontSize:11}}>{fmtSz(f.size||f.fileSize)}</td>
                    <td style={{padding:'8px 10px',fontFamily:"'Space Mono',monospace",fontSize:10,color:'#4a6080'}}>{fmtDT(f.sentAt||f.createdAt||f.timestamp)}</td>
                    <td style={{padding:'8px 10px'}}>
                      <DlBtn url={f.downloadUrl} name={f.originalName} token={token}
                        style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:'rgba(59,130,246,0.12)',color:'#3b82f6',border:'1px solid rgba(59,130,246,0.25)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                        ↓ DL
                      </DlBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  panel: {background:'#161d2e',border:'1px solid #1e2d45',borderRadius:12,padding:18},
  ph:    {marginBottom:12,paddingBottom:10,borderBottom:'1px solid #1e2d45',display:'flex',alignItems:'baseline',justifyContent:'space-between',flexWrap:'wrap',gap:6},
  pt:    {fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:'#8899bb',letterSpacing:'0.1em',textTransform:'uppercase'},
  ps:    {fontSize:11,color:'#4a6080'},
  sn:    {width:20,height:20,borderRadius:'50%',background:'rgba(59,130,246,0.18)',border:'1px solid rgba(59,130,246,0.3)',color:'#3b82f6',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Space Mono',monospace",marginTop:2},
  sl:    {fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'#4a6080',letterSpacing:'0.1em',marginBottom:4,textTransform:'uppercase'},
  empty: {textAlign:'center',padding:'28px',color:'#4a6080',fontFamily:"'Space Mono',monospace",fontSize:11},
  rb:    {fontFamily:"'Space Mono',monospace",fontSize:13,background:'rgba(255,255,255,0.04)',border:'1px solid #1e2d45',color:'#8899bb',borderRadius:6,width:27,height:27,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  dlBtn: {fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1,background:'rgba(139,85,198,0.12)',color:'#8b5cf6',border:'1px solid rgba(139,85,198,0.25)',borderRadius:5,padding:'3px 9px',cursor:'pointer',fontWeight:700},
};
