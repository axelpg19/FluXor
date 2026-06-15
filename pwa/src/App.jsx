import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase.js';

// ── Founder detection ──────────────────────────────────────────────────────────
function isFounder(profile) { return profile?.is_founder === true; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const MXN = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const todayISO  = () => new Date().toISOString().slice(0,10);
const thisMonth = () => new Date().toISOString().slice(0,7);

const TYPE_META = {
  gasto:         { label:'Gasto',         color:'var(--red)',    cls:'gasto',         icon:'↓' },
  ingreso:       { label:'Ingreso',       color:'var(--green)',  cls:'ingreso',       icon:'↑' },
  pendiente:     { label:'Pendiente',     color:'var(--yellow)', cls:'pendiente',     icon:'⏱' },
  transferencia: { label:'Transferencia', color:'var(--purple)', cls:'transferencia', icon:'⇄' },
};

function getFinancialPeriod(monthKey, cutoff) {
  const [year, month] = monthKey.split('-').map(Number);
  const c = Math.max(1, Math.min(Number(cutoff||1), 28));
  if (c === 1) return {
    start:`${year}-${String(month).padStart(2,'0')}-01`,
    end:`${year}-${String(month).padStart(2,'0')}-${new Date(year,month,0).getDate()}`
  };
  const fmt = d => d.toISOString().slice(0,10);
  return { start:fmt(new Date(year,month-2,c)), end:fmt(new Date(year,month-1,c-1)) };
}

// ── Monedas ────────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code:'MXN', name:'Peso mexicano' },    { code:'USD', name:'Dólar americano' },
  { code:'EUR', name:'Euro' },              { code:'GBP', name:'Libra esterlina' },
  { code:'CAD', name:'Dólar canadiense' },  { code:'JPY', name:'Yen japonés' },
  { code:'AUD', name:'Dólar australiano' }, { code:'CHF', name:'Franco suizo' },
  { code:'BRL', name:'Real brasileño' },    { code:'ARS', name:'Peso argentino' },
  { code:'COP', name:'Peso colombiano' },   { code:'INR', name:'Rupia india' },
  { code:'KRW', name:'Won coreano' },       { code:'CNY', name:'Yuan chino' },
];

async function fetchExchangeRate(from, to) {
  const t = ms => AbortSignal.timeout(ms);
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`,{signal:t(5000)});
    if (r.ok) { const j=await r.json(); if (j.rates?.[to]) return Number(j.rates[to]); }
  } catch {}
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${to}&to=${from}`,{signal:t(5000)});
    if (r.ok) { const j=await r.json(); const rv=j.rates?.[from]; if (rv&&rv>0) return 1/rv; }
  } catch {}
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`,{signal:t(6000)});
    if (r.ok) { const j=await r.json(); if (j.rates?.[to]) return Number(j.rates[to]); }
  } catch {}
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/USD`,{signal:t(6000)});
    if (r.ok) { const j=await r.json(); const fr=j.rates?.[from],tr=j.rates?.[to]; if (fr&&fr>0&&tr) return tr/fr; }
  } catch {}
  return null;
}

// ── useUndo ────────────────────────────────────────────────────────────────────
function useUndo() {
  const [toast,setToast] = useState(null);
  const timerRef = useRef(null);
  const pendingRef = useRef(null);
  const clear = () => { if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;} };
  const pushUndo = useCallback((msg,onConfirm,onUndo)=>{
    if(pendingRef.current){clear();pendingRef.current.onConfirm();}
    const id=crypto.randomUUID(), entry={id,message:msg,onConfirm,onUndo};
    pendingRef.current=entry; setToast(entry);
    timerRef.current=setTimeout(()=>{ if(pendingRef.current?.id===id){pendingRef.current.onConfirm();pendingRef.current=null;setToast(null);} },5000);
  },[]);
  const handleUndo    = useCallback(()=>{ if(!pendingRef.current)return; clear();pendingRef.current.onUndo();pendingRef.current=null;setToast(null); },[]);
  const handleDismiss = useCallback(()=>{ if(!pendingRef.current)return; clear();pendingRef.current.onConfirm();pendingRef.current=null;setToast(null); },[]);
  useEffect(()=>()=>{clear();if(pendingRef.current)pendingRef.current.onConfirm();},[]);
  return {toast,pushUndo,handleUndo,handleDismiss};
}

// ── UndoToast ──────────────────────────────────────────────────────────────────
function UndoToast({toast,onUndo,onDismiss}){
  const [pct,setPct]=useState(100); const start=useRef(Date.now());
  useEffect(()=>{ if(!toast)return; start.current=Date.now(); setPct(100);
    const iv=setInterval(()=>{ const p=Math.max(0,100-((Date.now()-start.current)/5000)*100); setPct(p); if(p<=0)clearInterval(iv); },50);
    return ()=>clearInterval(iv); },[toast?.id]);
  if(!toast)return null;
  return <div className="pwa-undo-wrap"><div className="pwa-undo-toast">
    <div className="pwa-undo-progress"><div className="pwa-undo-fill" style={{width:`${pct}%`}}/></div>
    <div className="pwa-undo-body">
      <span className="pwa-undo-msg">{toast.message}</span>
      <button className="pwa-undo-btn" onClick={onUndo}>Deshacer</button>
      <button onClick={onDismiss} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:'4px 6px',fontSize:16}}>×</button>
    </div>
  </div></div>;
}

// ── Early recovery ─────────────────────────────────────────────────────────────
let _earlyRecovery=false, _earlySession=null;
const _earlySub = supabase.auth.onAuthStateChange((ev,s)=>{ if(ev==='PASSWORD_RECOVERY'){_earlyRecovery=true;_earlySession=s;} });

// ── Icons SVG ──────────────────────────────────────────────────────────────────
const Ico = {
  search:  ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  user:    ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  sun:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  google:  ()=><svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  github:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>,
  mail:    ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  home:    ()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  list:    ()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  clock:   ()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  repeat:  ()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  trash:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  edit:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  star:    ()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

// ── PasswordStrengthBar ────────────────────────────────────────────────────────
function getStrength(p){
  if(!p)return{score:0,label:'',color:''};
  let s=0;
  if(p.length>=8)s++; if(p.length>=12)s++; if(/[A-Z]/.test(p))s++;
  if(/[0-9]/.test(p))s++; if(/[^A-Za-z0-9]/.test(p))s++;
  return [{score:0,label:'',color:'transparent'},{score:1,label:'Muy débil',color:'#ef4444'},{score:2,label:'Débil',color:'#f97316'},{score:3,label:'Regular',color:'#eab308'},{score:4,label:'Fuerte',color:'#22c55e'},{score:5,label:'Muy fuerte',color:'#10b981'}][Math.min(s,5)];
}
function PasswordStrengthBar({password}){
  const {score,label,color}=getStrength(password);
  if(!password)return null;
  return <div style={{marginTop:5}}>
    <div style={{display:'flex',gap:3,marginBottom:3}}>
      {[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=score?color:'var(--border)',transition:'background 300ms'}}/>)}
    </div>
    {label&&<p style={{fontSize:11,color,margin:0}}>{label}</p>}
  </div>;
}
function validatePwd(p){
  const e=[];
  if(p.length<8)e.push('Mínimo 8 caracteres');
  if(!/[A-Z]/.test(p))e.push('Al menos una mayúscula');
  if(!/[a-z]/.test(p))e.push('Al menos una minúscula');
  if(!/[0-9]/.test(p))e.push('Al menos un número');
  if(!/[^A-Za-z0-9]/.test(p))e.push('Al menos un símbolo');
  return e;
}

// ── ResetPasswordScreen ────────────────────────────────────────────────────────
function ResetPasswordScreen({onDone}){
  const [pwd,setPwd]=useState(''),[confirm,setConfirm]=useState(''),
        [loading,setLoading]=useState(false),[msg,setMsg]=useState(''),[isErr,setIsErr]=useState(false),[ok,setOk]=useState(false);
  const errs=validatePwd(pwd), mismatch=confirm&&pwd!==confirm;
  async function submit(e){
    e.preventDefault();
    if(errs.length){setMsg(errs[0]);setIsErr(true);return;}
    if(pwd!==confirm){setMsg('Las contraseñas no coinciden.');setIsErr(true);return;}
    setLoading(true);
    const {error}=await supabase.auth.updateUser({password:pwd});
    setLoading(false);
    if(error){setMsg(error.message||'Error al actualizar.');setIsErr(true);}
    else setOk(true);
  }
  return <div className="pwa-auth"><div className="pwa-auth-card">
    <div className="pwa-auth-logo-wrap"><img src="/icon-512.png" alt="FluXor" className="pwa-auth-logo-img"/></div>
    {ok?<div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div><p style={{fontSize:17,fontWeight:700,margin:'0 0 6px'}}>Contraseña actualizada</p><p style={{fontSize:13,color:'var(--muted)',margin:0}}>Tu contraseña se cambió correctamente.</p></div>
      <button className="pwa-submit" onClick={onDone} style={{width:'100%'}}>Ir a FluXor</button>
    </div>:<>
      <div style={{textAlign:'center'}}><h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:700}}>Nueva contraseña</h2><p style={{margin:0,fontSize:13,color:'var(--muted)'}}>Crea una contraseña segura</p></div>
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
        <div className="pwa-field"><label>Nueva contraseña</label><input className="pwa-input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" autoFocus/><PasswordStrengthBar password={pwd}/></div>
        <div className="pwa-field"><label>Confirmar</label><input className="pwa-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repite tu contraseña" style={mismatch?{borderColor:'#ef4444'}:{}}/>{mismatch&&<p style={{fontSize:11,color:'#ef4444',margin:'3px 0 0'}}>No coinciden</p>}</div>
        {msg&&<p className="pwa-error" style={{color:isErr?'var(--red)':'var(--green)',background:isErr?'rgba(248,113,113,0.1)':'rgba(34,197,94,0.1)'}}>{msg}</p>}
        <button type="submit" className="pwa-submit" disabled={loading||errs.length>0||mismatch||!confirm}>{loading?'Actualizando…':'Cambiar contraseña'}</button>
      </form>
    </>}
  </div></div>;
}

// ── AuthScreen ─────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [mode,setMode]=useState('main');
  const [email,setEmail]=useState(''),[pwd,setPwd]=useState('');
  const [loading,setLoading]=useState(false),[oauthProv,setOauthProv]=useState('');
  const [msg,setMsg]=useState(''),[isErr,setIsErr]=useState(false);
  const show=(t,err=false)=>{setMsg(t);setIsErr(err);};
  const reset=()=>{setMsg('');};
  function translateErr(e){
    const m=e.message?.toLowerCase()||'';
    if(m.includes('invalid login'))return 'Email o contraseña incorrectos.';
    if(m.includes('already registered'))return 'Ya existe una cuenta con ese email.';
    if(m.includes('email not confirmed'))return 'Confirma tu email primero.';
    return e.message;
  }
  async function oAuth(provider){
    reset();setOauthProv(provider);setLoading(true);
    const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/callback'}});
    if(error){setLoading(false);show('No se pudo iniciar la autenticación.',true);}
  }
  async function signIn(e){
    e.preventDefault();reset();setLoading(true);
    const {data,error}=await supabase.auth.signInWithPassword({email,password:pwd});
    setLoading(false);
    if(error)show(translateErr(error),true); else onAuth(data.session);
  }
  async function signUp(e){
    e.preventDefault();reset();
    const errs=validatePwd(pwd);if(errs.length){show(errs[0],true);return;}
    setLoading(true);
    const {data,error}=await supabase.auth.signUp({email,password:pwd});
    setLoading(false);
    if(error)show(translateErr(error),true);
    else if(!data.session)show('Revisa tu email para confirmar tu cuenta.');
    else onAuth(data.session);
  }
  async function forgotPwd(e){
    e.preventDefault();reset();setLoading(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setLoading(false);
    if(error)show(translateErr(error),true); else show('Si el email existe, recibirás instrucciones.');
  }
  return <div className="pwa-auth">
    <div aria-hidden style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}}>
      <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)',top:'-100px',left:'-80px',animation:'orb-move 12s ease-in-out infinite'}}/>
      <div style={{position:'absolute',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)',bottom:'5%',right:'-60px',animation:'orb-move 16s ease-in-out infinite reverse'}}/>
    </div>
    <div className="pwa-auth-card">
      <div className="pwa-auth-logo-wrap" style={{flexDirection:'column',gap:8}}>
        <img src="/icon-512.png" alt="FluXor" className="pwa-auth-logo-img"/>
        <span style={{fontSize:26,fontWeight:800,background:'linear-gradient(135deg,#818cf8,#c084fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.03em'}}>FluXor</span>
      </div>
      {loading&&oauthProv&&<div style={{textAlign:'center'}}><div className="pwa-spinner" style={{margin:'0 auto 10px'}}/><p style={{fontSize:13,color:'var(--muted)'}}>Redirigiendo…</p></div>}
      {!loading&&mode==='main'&&<>
        <p className="pwa-auth-sub">Control total de tus finanzas</p>
        {msg&&<p className="pwa-error" style={{color:isErr?'var(--red)':'var(--green)',textAlign:'center'}}>{msg}</p>}
        <button className="pwa-oauth-btn" onClick={()=>oAuth('google')}><Ico.google/> Continuar con Google</button>
        <button className="pwa-oauth-btn" onClick={()=>oAuth('github')}><Ico.github/> Continuar con GitHub</button>
        <div className="pwa-auth-divider"><span>o</span></div>
        <button className="pwa-oauth-btn pwa-oauth-email" onClick={()=>{reset();setMode('email');}}><Ico.mail/> Continuar con email</button>
      </>}
      {mode==='email'&&<>
        <button className="pwa-auth-back" onClick={()=>{reset();setMode('main');}}>← Volver</button>
        <form onSubmit={signIn} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="pwa-field"><label>Email</label><input className="pwa-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" required/></div>
          <div className="pwa-field"><label>Contraseña</label><input className="pwa-input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" required/></div>
          {msg&&<p className="pwa-error" style={{color:isErr?'var(--red)':'var(--green)'}}>{msg}</p>}
          <button type="submit" className="pwa-submit" disabled={loading}>{loading?'Un momento…':'Iniciar sesión'}</button>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <button type="button" className="pwa-auth-toggle" onClick={()=>{reset();setMode('forgot');}}>Olvidé mi contraseña</button>
            <button type="button" className="pwa-auth-toggle" onClick={()=>{reset();setMode('signup');}}>Crear cuenta</button>
          </div>
        </form>
      </>}
      {mode==='signup'&&<>
        <button className="pwa-auth-back" onClick={()=>{reset();setMode('email');}}>← Volver</button>
        <form onSubmit={signUp} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="pwa-field"><label>Email</label><input className="pwa-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required/></div>
          <div className="pwa-field"><label>Contraseña</label><input className="pwa-input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" required/><PasswordStrengthBar password={pwd}/></div>
          {msg&&<p className="pwa-error" style={{color:isErr?'var(--red)':'var(--green)'}}>{msg}</p>}
          <button type="submit" className="pwa-submit" disabled={loading}>{loading?'Creando cuenta…':'Crear cuenta'}</button>
          <button type="button" className="pwa-auth-toggle" onClick={()=>{reset();setMode('email');}}>Ya tengo cuenta</button>
        </form>
      </>}
      {mode==='forgot'&&<>
        <button className="pwa-auth-back" onClick={()=>{reset();setMode('email');}}>← Volver</button>
        <form onSubmit={forgotPwd} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="pwa-field"><label>Email</label><input className="pwa-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required/></div>
          {msg&&<p className="pwa-error" style={{color:isErr?'var(--red)':'var(--green)'}}>{msg}</p>}
          <button type="submit" className="pwa-submit" disabled={loading}>{loading?'Enviando…':'Enviar instrucciones'}</button>
        </form>
      </>}
    </div>
  </div>;
}

// ── UserSheet ──────────────────────────────────────────────────────────────────
function UserSheet({session,onClose,onSignOut}){
  const [profile,setProfile]=useState(null),[editing,setEditing]=useState(false),[nameInput,setNameInput]=useState('');
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[signingOut,setSigningOut]=useState(false);
  const userId=session?.user?.id||'', email=session?.user?.email||'';
  const meta=session?.user?.user_metadata||{};
  const founder=isFounder(profile);
  useEffect(()=>{
    supabase.from('profiles').select('*').eq('user_id',userId).single().then(({data:p})=>{
      const def={display_name:meta.full_name||meta.name||null,avatar_url:meta.avatar_url||meta.picture||null,created_at:session?.user?.created_at||null};
      const pr={...(p||def),...def,...(p||{})};
      setProfile(pr); setNameInput(pr.display_name||'');
    }).catch(()=>{
      const fb={display_name:meta.full_name||meta.name||null,avatar_url:meta.avatar_url||meta.picture||null,created_at:session?.user?.created_at||null};
      setProfile(fb); setNameInput(fb.display_name||'');
    });
  },[userId]);
  async function saveName(){
    if(!nameInput.trim())return; setSaving(true);
    await supabase.from('profiles').upsert({user_id:userId,display_name:nameInput.trim(),synced_at:new Date().toISOString()},{onConflict:'user_id'});
    setProfile(p=>({...p,display_name:nameInput.trim()}));
    setSaving(false); setSaved(true); setEditing(false);
    setTimeout(()=>setSaved(false),2000);
  }
  async function signOut(){setSigningOut(true);await supabase.auth.signOut();onSignOut();}
  const name=profile?.display_name||email.split('@')[0]||'Usuario';
  const avatarUrl=profile?.avatar_url||meta.avatar_url||null;
  const days=profile?.created_at?Math.floor((Date.now()-new Date(profile.created_at).getTime())/86400000):0;
  const daysLabel=days===0?'Hoy empezaste':days<30?`Llevas ${days} día${days>1?'s':''}`:`Llevas ${Math.floor(days/30)} mes${Math.floor(days/30)>1?'es':''}`;
  const h=new Date().getHours(); const greet=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  return <div className="pwa-sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="pwa-sheet" style={{gap:0}}>
      <div className="pwa-sheet-handle"/>
      <div style={{display:'flex',flexDirection:'column',gap:18,padding:'0 4px 8px'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{position:'relative',flexShrink:0}}>
            {avatarUrl?<img src={avatarUrl} alt={name} style={{width:68,height:68,borderRadius:'50%',objectFit:'cover',border:founder?'2px solid var(--accent)':'2px solid var(--border)'}}/>
            :<div className="pwa-user-sheet-avatar" style={{border:founder?'2px solid var(--accent)':'2px solid var(--border)'}}>{name.charAt(0).toUpperCase()}</div>}
            {founder&&<div style={{position:'absolute',bottom:-2,right:-2,background:'linear-gradient(135deg,#818cf8,#c084fc)',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid var(--panel)'}}><Ico.star/></div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:'0 0 2px',fontSize:11,color:'var(--muted)'}}>{greet},</p>
            {editing?<div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape')setEditing(false);}}
                style={{flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid var(--accent)',borderRadius:8,color:'var(--text)',fontSize:16,fontWeight:700,padding:'3px 8px',outline:'none'}} autoFocus maxLength={40}/>
              <button onClick={saveName} disabled={saving} style={{background:'rgba(129,140,248,0.2)',border:'1px solid var(--accent)',borderRadius:8,color:'var(--accent)',padding:'4px 10px',cursor:'pointer',fontSize:13}}>{saving?'…':'OK'}</button>
            </div>:<div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:17,fontWeight:800,letterSpacing:'-0.03em'}}>{name}</span>
              {founder&&<span className="founder-badge"><Ico.star/>Founder</span>}
              <button onClick={()=>setEditing(true)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:2,opacity:0.6}}><Ico.edit/></button>
              {saved&&<span style={{fontSize:11,color:'var(--green)'}}>Guardado</span>}
            </div>}
            <p style={{margin:'3px 0 0',fontSize:11,color:'var(--muted)'}}>{email}</p>
          </div>
        </div>
        <div style={{padding:'11px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid var(--border)',borderRadius:12,fontSize:13,color:'var(--muted)'}}>{daysLabel} usando FluXor</div>
        <div style={{height:1,background:'var(--border)'}}/>
        <button onClick={signOut} disabled={signingOut} style={{width:'100%',padding:14,borderRadius:12,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.22)',color:'#f87171',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          {signingOut?'Cerrando sesión…':'Cerrar sesión'}
        </button>
        <button onClick={onClose} style={{width:'100%',padding:12,borderRadius:12,background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',fontSize:14,cursor:'pointer'}}>Cancelar</button>
      </div>
    </div>
  </div>;
}

// ── PWASearch — búsqueda global ────────────────────────────────────────────────
function PWASearch({userId,onClose}){
  const [query,setQuery]=useState(''),[results,setResults]=useState([]);
  const [loading,setLoading]=useState(false),[selected,setSelected]=useState(0);
  const inputRef=useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{
    function handler(e){
      if(e.key==='Escape')onClose();
      if(e.key==='ArrowDown'){e.preventDefault();setSelected(s=>Math.min(s+1,results.length-1));}
      if(e.key==='ArrowUp'){e.preventDefault();setSelected(s=>Math.max(s-1,0));}
      if(e.key==='Enter'&&results[selected])onClose((results[selected].periodo_override||results[selected].fecha).slice(0,7));
    }
    document.addEventListener('keydown',handler);
    return ()=>document.removeEventListener('keydown',handler);
  },[results,selected,onClose]);
  useEffect(()=>{
    if(!query.trim()){setResults([]);return;}
    const t=setTimeout(async()=>{
      setLoading(true);
      const q=query.trim();
      const isNum=q.length>0&&!isNaN(Number(q.replace(/[$,\s]/g,'')))&&q.replace(/[$,\s]/g,'').length>0;
      let qb=supabase.from('movimientos')
        .select('id,tipo,monto,categoria,metodo,fuente,destino,subtipo,fecha,moneda,monto_original,periodo_override,deleted_at')
        .eq('user_id',userId).order('fecha',{ascending:false}).limit(150);
      if(isNum){
        const n=Number(q.replace(/[$,\s]/g,''));
        if(n>0)qb=qb.gte('monto',n*0.85).lte('monto',n*1.15);
      } else {
        qb=qb.or([`categoria.ilike.%${q}%`,`fuente.ilike.%${q}%`,`metodo.ilike.%${q}%`,`subtipo.ilike.%${q}%`,`destino.ilike.%${q}%`].join(','));
      }
      const {data,error}=await qb;
      if(error){
        const {data:fb}=await supabase.from('movimientos').select('id,tipo,monto,categoria,metodo,fuente,destino,subtipo,fecha,moneda,monto_original,periodo_override,deleted_at').eq('user_id',userId).ilike('categoria',`%${q}%`).order('fecha',{ascending:false}).limit(60);
        setResults((fb||[]).filter(r=>!r.deleted_at||r.deleted_at===''));
      } else {
        setResults((data||[]).filter(r=>!r.deleted_at||r.deleted_at===''));
      }
      setSelected(0); setLoading(false);
    },300);
    return ()=>clearTimeout(t);
  },[query,userId]);
  const amtColor=r=>r.tipo==='ingreso'?'var(--green)':r.tipo==='gasto'?'var(--red)':'var(--muted)';
  const sign=r=>r.tipo==='ingreso'?'+':r.tipo==='gasto'?'-':'';
  return <div className="pwa-sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="pwa-search-modal">
      <div className="pwa-search-input-wrap">
        <Ico.search/>
        <input ref={inputRef} className="pwa-search-input" placeholder="Categoría, tarjeta, monto…" value={query} onChange={e=>setQuery(e.target.value)}/>
        {loading&&<div className="pwa-spinner" style={{width:16,height:16,margin:0}}/>}
        <button onClick={()=>onClose()} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:13}}>Cerrar</button>
      </div>
      <div className="pwa-search-results">
        {!query.trim()&&<div style={{padding:'32px 20px',textAlign:'center',color:'var(--muted)',fontSize:13}}>Busca por categoría, tarjeta, método o monto</div>}
        {query.trim()&&!loading&&results.length===0&&<div style={{padding:'32px 20px',textAlign:'center',color:'var(--muted)',fontSize:13}}>Sin resultados para "{query}"</div>}
        {results.map((r,i)=>{
          const mk=(r.periodo_override||r.fecha).slice(0,7);
          const [y,m]=mk.split('-').map(Number);
          const label=new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'short',year:'numeric'});
          return <button key={r.id} className={`pwa-search-item ${i===selected?'active':''}`} onClick={()=>onClose(mk)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{r.categoria}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{r.fecha} · {label}{r.metodo?` · ${r.metodo}`:''}{r.fuente?` · ${r.fuente}`:''}</div>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:amtColor(r),flexShrink:0}}>{sign(r)}{MXN(r.monto)}</div>
          </button>;
        })}
      </div>
    </div>
  </div>;
}

// ── MovementSheet ──────────────────────────────────────────────────────────────
function MovementSheet({tipo,userId,cards=[],onSave,onClose,editing=null}){
  const [form,setForm]=useState({
    monto:editing?.monto||'', categoria:editing?.categoria||'',
    metodo:editing?.metodo||'efectivo', fuente:editing?.fuente||'',
    fecha:editing?.fecha||todayISO(), moneda:editing?.moneda||'MXN',
    tipo_cambio:editing?.tipo_cambio&&editing.tipo_cambio!==1?String(editing.tipo_cambio):'',
  });
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [fetchingRate,setFetchingRate]=useState(false),[showCur,setShowCur]=useState(false);
  const prevMoneda=useRef(form.moneda);
  const esMXN=form.moneda==='MXN';
  const tcNum=esMXN?1:(Number(form.tipo_cambio)||0);
  const montoNum=Number(form.monto)||0;
  const montoMXN=esMXN?montoNum:montoNum*tcNum;
  const showPreview=!esMXN&&montoNum>0&&tcNum>0;
  const creditCards=cards.filter(c=>c.tipo==='credito');
  const debitCards=cards.filter(c=>c.tipo==='debito');
  const availCards=form.metodo==='tarjeta'?[...creditCards,...debitCards]:[];
  const typeLabel={gasto:'Gasto',ingreso:'Ingreso',pendiente:'Pendiente',transferencia:'Transferencia'};
  useEffect(()=>{
    if(esMXN||form.moneda===prevMoneda.current)return;
    prevMoneda.current=form.moneda; setFetchingRate(true);
    fetchExchangeRate(form.moneda,'MXN').then(rate=>{
      if(rate)setForm(f=>({...f,tipo_cambio:Number(rate).toFixed(4)}));
    }).finally(()=>setFetchingRate(false));
  },[form.moneda,esMXN]);
  async function submit(e){
    e.preventDefault();
    if(!form.monto||Number(form.monto)<=0){setError('Ingresa un monto válido.');return;}
    if(!form.categoria.trim()){setError('Ingresa una categoría.');return;}
    if(!esMXN&&!form.tipo_cambio){setError('Ingresa el tipo de cambio.');return;}
    setSaving(true);setError('');
    const montoFinal=esMXN?Number(form.monto):Math.round(montoMXN*100)/100;
    const payload={user_id:userId,tipo,monto:montoFinal,categoria:form.categoria.trim(),
      metodo:form.metodo,fuente:form.fuente||null,fecha:form.fecha,estado:'activo',recurrente:0,
      moneda:form.moneda,monto_original:esMXN?null:Number(form.monto),tipo_cambio:esMXN?1:Number(form.tipo_cambio),
      synced_at:new Date().toISOString()};
    let err;
    if(editing){const {error:e}=await supabase.from('movimientos').update(payload).eq('id',editing.id);err=e;}
    else{const {error:e}=await supabase.from('movimientos').insert({...payload,sync_id:crypto.randomUUID()});err=e;}
    setSaving(false);
    if(err){setError('Error al guardar. Intenta de nuevo.');return;}
    onSave();
  }
  return <div className="pwa-sheet-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="pwa-sheet">
      <div className="pwa-sheet-handle"/>
      <div className="pwa-sheet-header">
        <h3 className="pwa-sheet-title">{editing?'Editar':'Nuevo'} {typeLabel[tipo]}</h3>
        <button className="pwa-sheet-close" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:'none',position:'relative'}}>
            <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Moneda</span>
            <div className="pwa-currency-wrap">
              <button type="button" className="pwa-currency-btn" onClick={e=>{e.stopPropagation();setShowCur(s=>!s);}}>
                <span>{form.moneda}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showCur&&<div className="pwa-currency-dropdown" style={{width:200}}>
                {CURRENCIES.map(c=><button key={c.code} type="button" className={`pwa-currency-option ${c.code===form.moneda?'active':''}`}
                  onClick={e=>{e.stopPropagation();setForm(f=>({...f,moneda:c.code,tipo_cambio:''}));prevMoneda.current='';setShowCur(false);}}>
                  <span style={{fontWeight:700}}>{c.code}</span>
                  <span style={{color:'var(--muted)',fontSize:11}}>{c.name}</span>
                </button>)}
              </div>}
            </div>
          </div>
          <div style={{flex:1}}>
            <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Monto {esMXN?'(MXN)':`(${form.moneda})`}</span>
            <input className="pwa-input" type="number" min="0" step="0.01" value={form.monto}
              onChange={e=>setForm(f=>({...f,monto:e.target.value}))}
              onBlur={e=>{const v=Number(e.target.value);if(v>0)setForm(f=>({...f,monto:v.toFixed(2)}));}}
              placeholder="0.00" required/>
          </div>
        </div>
        {!esMXN&&<div>
          <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>
            Tipo de cambio (1 {form.moneda} = ? MXN){fetchingRate&&<span style={{color:'var(--accent)',marginLeft:6,fontSize:11}}> ⟳ Consultando…</span>}
          </span>
          <input className="pwa-input" type="number" min="0" step="0.0001" value={form.tipo_cambio}
            onChange={e=>setForm(f=>({...f,tipo_cambio:e.target.value}))} placeholder={fetchingRate?'Obteniendo…':'Ej: 17.25'} disabled={fetchingRate} required/>
          {showPreview&&<p style={{fontSize:12,color:'var(--accent)',margin:'5px 0 0'}}>≈ {MXN(montoMXN)} MXN</p>}
        </div>}
        <div>
          <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Categoría</span>
          <input className="pwa-input" type="text" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} placeholder="Ej: Comida, Sueldo, Netflix…" required/>
        </div>
        <div>
          <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Método</span>
          <div style={{display:'flex',gap:8}}>
            {['efectivo','tarjeta'].map(m=><button key={m} type="button" className={`pwa-method-btn ${form.metodo===m?'active':''}`}
              onClick={()=>setForm(f=>({...f,metodo:m,fuente:''}))}>
              {m==='efectivo'?'Efectivo':'Tarjeta'}
            </button>)}
          </div>
        </div>
        {form.metodo==='tarjeta'&&availCards.length>0&&<div>
          <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Tarjeta</span>
          <select className="pwa-input" value={form.fuente} onChange={e=>setForm(f=>({...f,fuente:e.target.value}))}>
            <option value="">Sin especificar</option>
            {availCards.map(c=><option key={c.id||c.nombre} value={c.nombre}>{c.nombre} ({c.tipo})</option>)}
          </select>
        </div>}
        <div>
          <span style={{fontSize:11.5,fontWeight:600,color:'var(--muted)',display:'block',marginBottom:6}}>Fecha</span>
          <input className="pwa-input" type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} required/>
        </div>
        {error&&<p style={{color:'var(--red)',fontSize:13,margin:0}}>{error}</p>}
        <button type="submit" className="pwa-submit" disabled={saving} style={{marginTop:4}}>
          {saving?'Guardando…':(editing?'Guardar cambios':`Agregar ${typeLabel[tipo]}`)}
        </button>
      </form>
    </div>
  </div>;
}

// ── Mini Donut ─────────────────────────────────────────────────────────────────
function MiniDonut({ingresos,gastos}){
  const SIZE=72,cx=36,cy=36,R=27,SW=10,circ=2*Math.PI*R;
  const total=ingresos+gastos, balance=ingresos-gastos;
  const incDash=total>0?(ingresos/total)*circ:0;
  return <div className="pwa-mini-donut-wrap">
    <div className="pwa-mini-donut-svg-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={SW}/>
        {ingresos>0&&<circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(74,222,128,0.75)" strokeWidth={SW} strokeDasharray={`${incDash} ${circ-incDash}`} strokeDashoffset={circ/4} strokeLinecap="butt"/>}
        {gastos>0&&<circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(251,113,133,0.75)" strokeWidth={SW} strokeDasharray={`${circ-incDash} ${incDash}`} strokeDashoffset={circ/4-incDash} strokeLinecap="butt"/>}
      </svg>
      <div className="pwa-mini-donut-center">
        <span style={{fontSize:8,color:'var(--muted)'}}>Balance</span>
        <span style={{fontSize:10,fontWeight:700,color:balance>=0?'var(--green)':'var(--red)'}}>{balance>=0?'+':''}{MXN(balance)}</span>
      </div>
    </div>
    <div className="pwa-mini-donut-legend">
      <span className="pwa-mini-legend-item"><span style={{width:8,height:8,borderRadius:'50%',background:'rgba(74,222,128,0.8)',display:'inline-block',marginRight:5}}/><span style={{fontSize:11,color:'var(--muted)'}}>Ingresos</span><span style={{fontSize:11,fontWeight:600,color:'var(--green)',marginLeft:4}}>{MXN(ingresos)}</span></span>
      <span className="pwa-mini-legend-item"><span style={{width:8,height:8,borderRadius:'50%',background:'rgba(251,113,133,0.8)',display:'inline-block',marginRight:5}}/><span style={{fontSize:11,color:'var(--muted)'}}>Gastos</span><span style={{fontSize:11,fontWeight:600,color:'var(--red)',marginLeft:4}}>{MXN(gastos)}</span></span>
    </div>
  </div>;
}

// ── Tab: Cobros pendientes ─────────────────────────────────────────────────────
function CobrosTab({userId,onRefresh}){
  const [pendientes,setPendientes]=useState([]),[loading,setLoading]=useState(true);
  const [liquidating,setLiquidating]=useState(null),[parcialId,setParcialId]=useState(null),[parcialMonto,setParcialMonto]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from('movimientos')
      .select('*')
      .eq('user_id',userId)
      .eq('tipo','pendiente')
      .order('fecha',{ascending:false});
    // Filtrar en cliente
    const activos=(data||[]).filter(p=>!p.deleted_at);
    setPendientes(activos);setLoading(false);
  },[userId]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{load();},[load]);
  async function liquidar(mov,monto){
    setLiquidating(mov.id);
    await supabase.from('movimientos').insert({user_id:userId,tipo:'ingreso',monto,categoria:mov.categoria,metodo:mov.metodo||'efectivo',fuente:mov.fuente||null,fecha:todayISO(),estado:'activo',recurrente:0,moneda:'MXN',tipo_cambio:1,synced_at:new Date().toISOString(),sync_id:crypto.randomUUID(),pendiente_origen_id:mov.id});
    await supabase.from('movimientos').update({deleted_at:new Date().toISOString()}).eq('id',mov.id);
    setParcialId(null);setParcialMonto('');await load();onRefresh();setLiquidating(null);
  }
  if(loading)return <div className="pwa-tab-content"><div className="pwa-spinner"/></div>;
  return <div className="pwa-tab-content">
    <div className="pwa-section-title">Pendientes</div>
    {pendientes.length===0&&<div className="pwa-empty">Sin cobros pendientes.<br/>Usa el botón "Pendiente" en Inicio para registrar.</div>}
    {pendientes.map(p=><div key={p.id} className="pwa-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:15}}>{p.categoria}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{p.fecha}{p.fuente?` · ${p.fuente}`:''}</div>
        </div>
        <div style={{fontSize:18,fontWeight:800,color:'var(--yellow)'}}>{MXN(p.monto)}</div>
      </div>
      {parcialId===p.id?<div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input className="pwa-input" type="number" min="0.01" max={p.monto} step="0.01" value={parcialMonto} onChange={e=>setParcialMonto(e.target.value)} placeholder="Monto a cobrar" style={{flex:1}} autoFocus/>
        <button className="pwa-submit" style={{flex:'none',padding:'10px 14px',marginTop:0}} disabled={!parcialMonto||Number(parcialMonto)<=0||liquidating===p.id} onClick={()=>liquidar(p,Number(parcialMonto))}>
          {liquidating===p.id?'…':'Cobrar'}
        </button>
        <button onClick={()=>{setParcialId(null);setParcialMonto('');}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,padding:'4px 8px'}}>×</button>
      </div>:<div style={{display:'flex',gap:8}}>
        <button className="pwa-method-btn active" style={{flex:1,padding:10}} onClick={()=>liquidar(p,p.monto)} disabled={liquidating===p.id}>{liquidating===p.id?'…':'Cobrar todo'}</button>
        <button className="pwa-method-btn" style={{flex:1,padding:10}} onClick={()=>{setParcialId(p.id);setParcialMonto('');}}>Cobro parcial</button>
      </div>}
    </div>)}
  </div>;
}

// ── Tab: Gastos fijos ──────────────────────────────────────────────────────────
function FijosTab({userId}){
  const [recurrentes,setRecurrentes]=useState([]),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from('recurrentes')
      .select('*')
      .eq('user_id',userId)
      .order('categoria',{ascending:true});
    // Filtrar eliminados en cliente
    const vivos=(data||[]).filter(r=>!r.deleted_at);
    // Deduplicar: preferir los que tienen sync_id y categoria definida
    const seenSyncId=new Set(), seenContent=new Set();
    const deduped=vivos.filter(r=>{
      if(r.sync_id){if(seenSyncId.has(r.sync_id))return false;seenSyncId.add(r.sync_id);}
      if(!r.categoria)return false; // omitir sin nombre
      const key=`${r.categoria}|${r.monto}|${r.dia}|${r.activo}|${r.metodo}`;
      if(seenContent.has(key))return false; seenContent.add(key); return true;
    });
    setRecurrentes(deduped);setLoading(false);
  },[userId]);
  useEffect(()=>{load();},[load]);
  async function toggle(r){
    await supabase.from('recurrentes').update({activo:r.activo?0:1,synced_at:new Date().toISOString()}).eq('id',r.id);
    load();
  }
  if(loading)return <div className="pwa-tab-content"><div className="pwa-spinner"/></div>;
  const activos=recurrentes.filter(r=>r.activo);
  const pausados=recurrentes.filter(r=>!r.activo);
  const Card=({r})=><div className="pwa-card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div>
        <div style={{fontWeight:700,fontSize:14}}>{r.categoria||'Sin nombre'}</div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Día {r.dia} · {r.metodo||'efectivo'}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{fontSize:15,fontWeight:700,color:r.activo?'var(--red)':'var(--muted)'}}>{MXN(r.monto)}</div>
        <button onClick={()=>toggle(r)} style={{padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',
          background:r.activo?'rgba(74,222,128,0.12)':'rgba(255,255,255,0.04)',
          borderColor:r.activo?'rgba(74,222,128,0.3)':'var(--border)',
          color:r.activo?'var(--green)':'var(--muted)'}}>
          {r.activo?'Activo':'Pausado'}
        </button>
      </div>
    </div>
  </div>;
  return <div className="pwa-tab-content">
    <div className="pwa-section-title">Gastos fijos activos</div>
    {activos.length===0&&<div className="pwa-empty">Sin gastos fijos activos.</div>}
    {activos.map(r=><Card key={r.id} r={r}/>)}
    {pausados.length>0&&<><div className="pwa-section-title" style={{marginTop:16}}>Pausados</div>
      {pausados.map(r=><div key={r.id} style={{opacity:0.55}}><Card r={r}/></div>)}
    </>}
  </div>;
}

// ── Tab: Movimientos ───────────────────────────────────────────────────────────
function MovimientosTab({movements,onDelete,onEdit,swipedId,setSwipedId}){
  if(movements.length===0)return <div className="pwa-tab-content"><div className="pwa-empty">Sin movimientos en este periodo.<br/>Registra uno desde la pestaña Inicio.</div></div>;
  return <div className="pwa-tab-content">
    <div className="pwa-section-title">{movements.length} movimiento{movements.length!==1?'s':''} en el periodo</div>
    {movements.map(m=>{
      const meta=TYPE_META[m.tipo]||TYPE_META.gasto;
      const sign=m.tipo==='ingreso'?'+':m.tipo==='gasto'?'-':'';
      const isSwiped=swipedId===m.id;
      return <div key={m.sync_id||m.id} className="pwa-movement-swipe-wrap">
        <div className={`pwa-movement-row ${isSwiped?'swiped':''}`}
          onTouchStart={e=>{e.currentTarget._tx=e.touches[0].clientX;}}
          onTouchEnd={e=>{const d=e.changedTouches[0].clientX-(e.currentTarget._tx||0);if(d<-50)setSwipedId(m.id);else if(d>30)setSwipedId(null);}}>
          <div className={`pwa-movement-icon ${meta.cls}`}>{meta.icon}</div>
          <div className="pwa-movement-info" onClick={()=>{setSwipedId(null);onEdit(m);}}>
            <div className="pwa-movement-cat">{m.categoria||'—'}</div>
            <div className="pwa-movement-meta">
              {new Date(m.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'})}
              {m.metodo?` · ${m.metodo}`:''}
              {m.fuente?` · ${m.fuente}`:''}
            </div>
          </div>
          <div className={`pwa-movement-amount ${meta.cls}`}>{sign}{MXN(m.monto)}</div>
        </div>
        {isSwiped&&<div className="pwa-swipe-actions">
          <button className="pwa-swipe-delete" onClick={()=>onDelete(m)}><Ico.trash/></button>
        </div>}
      </div>;
    })}
  </div>;
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
  const [recoveryMode,setRecoveryMode]=useState(_earlyRecovery);
  const [movements,setMovements]=useState([]),[cards,setCards]=useState([]);
  const [selectedMonth,setSelectedMonth]=useState(thisMonth());
  const [metrics,setMetrics]=useState({ingresos:0,gastos:0,balance:0});
  const [activeSheet,setActiveSheet]=useState(null),[editingMov,setEditingMov]=useState(null);
  const [refreshKey,setRefreshKey]=useState(0),[cutoffDay,setCutoffDay]=useState(1);
  const [profileName,setProfileName]=useState(''),[tema,setTema]=useState('dark');
  const [showSearch,setShowSearch]=useState(false),[activeTab,setActiveTab]=useState('inicio');
  const [swipedId,setSwipedId]=useState(null);
  const {toast:undoToast,pushUndo,handleUndo,handleDismiss}=useUndo();

  // Tema
  useEffect(()=>{
    const saved=localStorage.getItem('fluxor-tema')||'dark';
    setTema(saved); apply(saved);
    const mq=window.matchMedia('(prefers-color-scheme: dark)');
    const h=()=>{if(saved==='system')apply('system');};
    mq.addEventListener('change',h); return ()=>mq.removeEventListener('change',h);
  },[]);
  function apply(t){const dark=window.matchMedia('(prefers-color-scheme: dark)').matches;const eff=t==='system'?(dark?'dark':'light'):t;document.documentElement.setAttribute('data-theme',eff);}
  function toggleTema(){const n=tema==='dark'?'light':tema==='light'?'system':'dark';setTema(n);apply(n);localStorage.setItem('fluxor-tema',n);}

  // Navegación mes
  function navigateMonth(dir){
    const [y,m]=selectedMonth.split('-').map(Number);
    const next=dir==='prev'?(m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`):(m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`);
    setSelectedMonth(next);
  }
  function monthLabel(){
    const [y,m]=selectedMonth.split('-').map(Number);
    return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  }

  // Auth
  useEffect(()=>{
    if(_earlyRecovery&&_earlySession){setSession(_earlySession);setLoading(false);_earlySub.data?.subscription?.unsubscribe?.();loadProfileName(_earlySession);
      const {data:{subscription}}=supabase.auth.onAuthStateChange((ev,s)=>{if(ev==='PASSWORD_RECOVERY'){setSession(s);setRecoveryMode(true);}else setSession(s);});
      return ()=>subscription.unsubscribe();}
    const hash=window.location.hash||'',search=window.location.search||'';
    const raw=hash.replace('#','')||search.replace('?','');
    const p=new URLSearchParams(raw);
    const tokenType=p.get('type'),tokenHash=p.get('token_hash'),accessToken=p.get('access_token');
    const isRec=tokenType==='recovery'&&(!!tokenHash||!!accessToken);
    if(isRec){
      const doRec=tokenHash?supabase.auth.verifyOtp({token_hash:tokenHash,type:'recovery'}):supabase.auth.setSession({access_token:accessToken,refresh_token:p.get('refresh_token')||''});
      doRec.then(({data,error})=>{if(!error&&data.session){setSession(data.session);setRecoveryMode(true);}setLoading(false);window.history.replaceState(null,'','/');}).catch(()=>setLoading(false));
      const {data:{subscription}}=supabase.auth.onAuthStateChange((ev,s)=>{if(ev==='PASSWORD_RECOVERY'){setSession(s);setRecoveryMode(true);}else setSession(s);});
      return ()=>subscription.unsubscribe();}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);if(data.session)loadProfileName(data.session);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((ev,s)=>{if(ev==='PASSWORD_RECOVERY'){setSession(s);setRecoveryMode(true);setLoading(false);window.history.replaceState(null,'','/');}else{setSession(s);if(s)loadProfileName(s);}});
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadProfileName(s){
    if(!s?.user?.id)return;
    const meta=s.user.user_metadata||{};
    const {data:p}=await supabase.from('profiles').select('display_name').eq('user_id',s.user.id).single();
    const name=p?.display_name||meta.full_name||meta.name||s.user.email?.split('@')[0]||'';
    if(name)setProfileName(name);
  }

  // Data
  const loadData=useCallback(async()=>{
    if(!session?.user?.id)return;

    // Cargar día de corte desde Supabase si aún no lo tenemos
    if(cutoffDay===1){
      try {
        const {data:cfg}=await supabase.from('configuracion')
          .select('valor').eq('user_id',session.user.id).eq('clave','dia_corte').single();
        if(cfg?.valor){
          const val=Number(cfg.valor);
          if(val>=2&&val<=28){setCutoffDay(val);return;} // re-trigger loadData con el valor correcto
        }
      } catch { /* usar default 1 */ }
    }

    const period=getFinancialPeriod(selectedMonth,cutoffDay);
    const [normalRes,overrideRes,cardsRes]=await Promise.all([
      supabase.from('movimientos').select('*').eq('user_id',session.user.id).is('periodo_override',null).gte('fecha',period.start).lte('fecha',period.end).order('fecha',{ascending:false}).limit(500),
      supabase.from('movimientos').select('*').eq('user_id',session.user.id).eq('periodo_override',selectedMonth).order('fecha',{ascending:false}).limit(200),
      supabase.from('tarjetas').select('*').eq('user_id',session.user.id).order('nombre',{ascending:true}),
    ]);
    console.log('[PWA] periodo:', period.start, '-', period.end);
    console.log('[PWA] normalRes:', normalRes.data?.length, normalRes.error?.message);
    console.log('[PWA] overrideRes:', overrideRes.data?.length, overrideRes.error?.message);
    console.log('[PWA] sample:', normalRes.data?.slice(0,2).map(m=>({fecha:m.fecha,cat:m.categoria,del:m.deleted_at})));
    // Filtrar deleted_at en cliente
    const all=[...(normalRes.data||[]),...(overrideRes.data||[])].filter(m=>!m.deleted_at);
    const seen=new Set(); const data=all.filter(m=>{if(seen.has(m.id))return false;seen.add(m.id);return true;}).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    setMovements(data);
    const ingresos=data.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+m.monto,0);
    const gastos=data.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+m.monto,0);
    setMetrics({ingresos,gastos,balance:ingresos-gastos});
    if(cardsRes.data)setCards(cardsRes.data);
  },[session,selectedMonth,cutoffDay]);

  useEffect(()=>{loadData();},[loadData,refreshKey]);
  const refresh=()=>setRefreshKey(k=>k+1);

  async function handleDelete(mov){
    setMovements(prev=>prev.filter(m=>m.id!==mov.id));
    setSwipedId(null);
    const rest=movements.filter(m=>m.id!==mov.id);
    const ing=rest.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+m.monto,0);
    const gas=rest.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+m.monto,0);
    setMetrics({ingresos:ing,gastos:gas,balance:ing-gas});
    pushUndo(`${TYPE_META[mov.tipo]?.label||'Movimiento'} eliminado`,
      async()=>{await supabase.from('movimientos').update({deleted_at:new Date().toISOString()}).eq('id',mov.id);refresh();},
      ()=>{setMovements(prev=>[...prev,mov].sort((a,b)=>b.fecha.localeCompare(a.fecha)));refresh();}
    );
  }

  if(loading)return <div className="pwa-shell" style={{alignItems:'center',justifyContent:'center'}}><div className="pwa-spinner"/></div>;
  if(recoveryMode)return <div className="pwa-shell"><ResetPasswordScreen onDone={()=>{setRecoveryMode(false);window.history.replaceState(null,'','/');}} /></div>;
  if(!session)return <div className="pwa-shell"><AuthScreen onAuth={s=>{setSession(s);loadProfileName(s);}}/></div>;

  const period=getFinancialPeriod(selectedMonth,cutoffDay);
  const h=new Date().getHours(); const greet=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';

  const TABS=[
    {id:'inicio',   label:'Inicio',      icon:<Ico.home/>},
    {id:'movs',     label:'Movimientos', icon:<Ico.list/>},
    {id:'cobros',   label:'Pendientes',  icon:<Ico.clock/>},
    {id:'fijos',    label:'Fijos',       icon:<Ico.repeat/>},
  ];

  return <div className="pwa-shell">
    {/* Orbs de fondo */}
    <div aria-hidden style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}}>
      <div style={{position:'absolute',width:340,height:340,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.11) 0%,transparent 70%)',top:'-80px',left:'-60px',animation:'orb-move 12s ease-in-out infinite'}}/>
      <div style={{position:'absolute',width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.09) 0%,transparent 70%)',bottom:'10%',right:'-60px',animation:'orb-move 15s ease-in-out infinite reverse'}}/>
    </div>

    {/* Header */}
    <header className="pwa-header">
      <div>
        <div className="pwa-header-title">FluXor</div>
        {profileName&&<div className="pwa-header-subtitle">{greet}, {profileName.split(' ')[0]}</div>}
        <div className="pwa-month-nav">
          <button type="button" className="pwa-month-nav-btn" onClick={()=>navigateMonth('prev')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <label className="pwa-month-label-wrap">
            <span className="pwa-month-label-text">{monthLabel()}</span>
            <input type="month" value={selectedMonth} onChange={e=>e.target.value&&setSelectedMonth(e.target.value)} className="pwa-month-picker-hidden"/>
          </label>
          <button type="button" className="pwa-month-nav-btn" onClick={()=>navigateMonth('next')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        {cutoffDay>1&&<div className="pwa-period-label">{new Date(period.start+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'})} – {new Date(period.end+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</div>}
      </div>
      <div className="pwa-header-right">
        <button className="pwa-user-btn" onClick={()=>setShowSearch(true)} title="Buscar"><Ico.search/></button>
        <button className="pwa-user-btn" onClick={toggleTema} title="Tema">{tema==='dark'?<Ico.sun/>:<Ico.moon/>}</button>
        <button className="pwa-user-btn" onClick={()=>setActiveSheet('user')} title="Perfil"><Ico.user/></button>
      </div>
    </header>

    {/* Contenido por tab */}
    <div className="pwa-content">
      {activeTab==='inicio'&&<>
        {/* Métricas */}
        <div className="pwa-metrics">
          <div className="pwa-metric"><div className="pwa-metric-label">Ingresos</div><div className="pwa-metric-value income">{MXN(metrics.ingresos)}</div></div>
          <div className="pwa-metric"><div className="pwa-metric-label">Gastos</div><div className="pwa-metric-value expense">{MXN(metrics.gastos)}</div></div>
          <div className="pwa-metric"><div className="pwa-metric-label">Balance</div><div className="pwa-metric-value" style={{color:metrics.balance>=0?'var(--green)':'var(--red)'}}>{MXN(metrics.balance)}</div></div>
        </div>
        {/* Donut */}
        {(metrics.ingresos>0||metrics.gastos>0)&&<MiniDonut ingresos={metrics.ingresos} gastos={metrics.gastos}/>}
        {/* Acciones */}
        <div className="pwa-actions">
          {Object.entries(TYPE_META).map(([tipo,meta])=><button key={tipo} className={`pwa-action-btn ${meta.cls}`} onClick={()=>{setEditingMov(null);setActiveSheet(tipo);}}>
            <span style={{color:meta.color,fontSize:18}}>{meta.icon}</span>
            <span>{meta.label}</span>
          </button>)}
        </div>
        {/* Movimientos recientes */}
        <div className="pwa-movements-wrap">
          <div className="pwa-movements-title">Últimos movimientos</div>
          {movements.length===0&&<div className="pwa-empty">Sin movimientos en este periodo.</div>}
          {movements.slice(0,8).map(m=>{
            const meta=TYPE_META[m.tipo]||TYPE_META.gasto;
            const sign=m.tipo==='ingreso'?'+':m.tipo==='gasto'?'-':'';
            return <div key={m.sync_id||m.id} className="pwa-movement-row" onClick={()=>{setEditingMov(m);setActiveSheet(m.tipo);}}>
              <div className={`pwa-movement-icon ${meta.cls}`}>{meta.icon}</div>
              <div className="pwa-movement-info">
                <div className="pwa-movement-cat">{m.categoria||'—'}</div>
                <div className="pwa-movement-meta">{new Date(m.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'})}{m.metodo?` · ${m.metodo}`:''}{m.fuente?` · ${m.fuente}`:''}</div>
              </div>
              <div className={`pwa-movement-amount ${meta.cls}`}>{sign}{MXN(m.monto)}</div>
            </div>;
          })}
          {movements.length>8&&<button onClick={()=>setActiveTab('movs')} style={{width:'100%',padding:'12px',background:'none',border:'1px solid var(--border)',borderRadius:10,color:'var(--accent)',fontSize:13,fontWeight:600,cursor:'pointer',marginTop:6}}>Ver todos los movimientos ({movements.length})</button>}
        </div>
      </>}
      {activeTab==='movs'&&<MovimientosTab movements={movements} onDelete={handleDelete} onEdit={m=>{setEditingMov(m);setActiveSheet(m.tipo);}} swipedId={swipedId} setSwipedId={setSwipedId}/>}
      {activeTab==='cobros'&&<CobrosTab userId={session.user.id} onRefresh={refresh}/>}
      {activeTab==='fijos'&&<FijosTab userId={session.user.id}/>}
    </div>

    {/* Tab bar */}
    <nav className="pwa-tab-bar">
      {TABS.map(tab=><button key={tab.id} className={`pwa-tab-btn ${activeTab===tab.id?'active':''}`} onClick={()=>setActiveTab(tab.id)}>
        {tab.icon}<span>{tab.label}</span>
      </button>)}
    </nav>

    <UndoToast toast={undoToast} onUndo={handleUndo} onDismiss={handleDismiss}/>

    {showSearch&&<PWASearch userId={session.user.id} onClose={mk=>{setShowSearch(false);if(mk)setSelectedMonth(mk);}}/>}

    {activeSheet&&activeSheet!=='user'&&<MovementSheet tipo={activeSheet} userId={session.user.id} cards={cards}
      onSave={()=>{setActiveSheet(null);setEditingMov(null);refresh();}}
      onClose={()=>{setActiveSheet(null);setEditingMov(null);}}
      editing={editingMov}/>}

    {activeSheet==='user'&&<UserSheet session={session} onClose={()=>setActiveSheet(null)} onSignOut={()=>{setSession(null);setActiveSheet(null);}}/>}
  </div>;
}
