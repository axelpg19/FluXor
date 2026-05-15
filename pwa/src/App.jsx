import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MXN = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ── Íconos SVG inline ─────────────────────────────────────────────────────────

const Ico = {
  down:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  up:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  clock:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  arrows: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  user:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  x:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

const TYPE_META = {
  gasto:         { label: 'Gasto',         icon: Ico.down,   color: 'var(--red)',    cls: 'gasto' },
  ingreso:       { label: 'Ingreso',       icon: Ico.up,     color: 'var(--green)',  cls: 'ingreso' },
  pendiente:     { label: 'Pendiente',     icon: Ico.clock,  color: 'var(--yellow)', cls: 'pendiente' },
  transferencia: { label: 'Transferencia', icon: Ico.arrows, color: 'var(--purple)', cls: 'transferencia' },
};

// ── Pantalla de Auth ──────────────────────────────────────────────────────────

// ── Íconos OAuth ──────────────────────────────────────────────────────────────
function IconGoogle() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}
function IconMicrosoft() {
  return (
    <svg width="19" height="19" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
      <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
      <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
      <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

// ── Validación de contraseña segura ──────────────────────────────────────────
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const levels = [
    { score: 0, label: '',          color: 'transparent' },
    { score: 1, label: 'Muy débil', color: '#ef4444' },
    { score: 2, label: 'Débil',     color: '#f97316' },
    { score: 3, label: 'Regular',   color: '#eab308' },
    { score: 4, label: 'Fuerte',    color: '#22c55e' },
    { score: 5, label: 'Muy fuerte',color: '#10b981' },
  ];
  return levels[Math.min(score, 5)];
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex:1, height:3, borderRadius:2,
            background: i <= score ? color : 'var(--border)',
            transition: 'background 300ms'
          }} />
        ))}
      </div>
      {label && <p style={{ fontSize:11, color, margin:0 }}>{label}</p>}
    </div>
  );
}

function validatePassword(pwd) {
  const errors = [];
  if (pwd.length < 8)           errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pwd))       errors.push('Al menos una mayúscula');
  if (!/[0-9]/.test(pwd))       errors.push('Al menos un número');
  return errors;
}

// ── ResetPasswordScreen — nueva contraseña desde el link del email ─────────
function ResetPasswordScreen({ onDone }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState('');
  const [isError, setIsError]     = useState(false);
  const [success, setSuccess]     = useState(false);

  const strength  = getPasswordStrength(password);
  const errors    = validatePassword(password);
  const mismatch  = confirm && password !== confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    if (errors.length) { setMsg(errors[0]); setIsError(true); return; }
    if (password !== confirm) { setMsg('Las contraseñas no coinciden.'); setIsError(true); return; }
    setLoading(true); setMsg('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setMsg(error.message || 'Error al actualizar. Intenta de nuevo.'); setIsError(true); }
    else { setSuccess(true); }
  }

  const orbs = (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top:'-100px', left:'-80px', animation:'orb-move 12s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom:'5%', right:'-60px', animation:'orb-move 16s ease-in-out infinite reverse' }}/>
    </div>
  );

  return (
    <div className="pwa-auth">
      {orbs}
      <div className="pwa-auth-card">
        <div className="pwa-auth-logo-wrap">
          <img src="/logo-fluxor.png" alt="FluXor" className="pwa-auth-logo-img" />
        </div>

        {success ? (
          <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <p style={{ fontSize:17, fontWeight:700, margin:'0 0 8px' }}>Contraseña actualizada</p>
              <p style={{ fontSize:13, color:'var(--muted)', margin:0 }}>Tu contraseña se cambió correctamente.</p>
            </div>
            <button className="pwa-submit" onClick={onDone} style={{ width:'100%' }}>
              Ir a FluXor
            </button>
          </div>
        ) : (
          <>
            <div className="auth-heading" style={{ textAlign:'center' }}>
              <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:700 }}>Nueva contraseña</h2>
              <p style={{ margin:0, fontSize:13, color:'var(--muted)' }}>Crea una contraseña segura para tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="pwa-field">
                <label>Nueva contraseña</label>
                <input
                  className="pwa-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoFocus
                />
                <PasswordStrengthBar password={password} />
                {errors.length > 0 && password && (
                  <p style={{ fontSize:11, color:'var(--muted)', margin:'4px 0 0' }}>
                    Necesitas: {errors.join(' · ')}
                  </p>
                )}
              </div>

              <div className="pwa-field">
                <label>Confirmar contraseña</label>
                <input
                  className="pwa-input"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite tu contraseña"
                  style={mismatch ? { borderColor:'#ef4444' } : {}}
                />
                {mismatch && <p style={{ fontSize:11, color:'#ef4444', margin:'4px 0 0' }}>Las contraseñas no coinciden</p>}
              </div>

              {msg && (
                <p style={{
                  fontSize:13, margin:0, padding:'10px 14px', borderRadius:8,
                  color: isError ? '#f87171' : '#22c55e',
                  background: isError ? 'rgba(248,113,113,0.1)' : 'rgba(34,197,94,0.1)'
                }}>{msg}</p>
              )}

              <button
                type="submit"
                className="pwa-submit"
                disabled={loading || errors.length > 0 || mismatch || !confirm}
              >
                {loading ? 'Actualizando…' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState('main'); // 'main'|'email'|'signup'|'forgot'|'oauth-pending'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [oauthProvider, setOauthProvider] = useState('');
  const [msg, setMsg]           = useState('');
  const [isError, setIsError]   = useState(false);

  function showMsg(text, err = false) { setMsg(text); setIsError(err); }
  function reset() { setMsg(''); }

  // ── OAuth ──────────────────────────────────────────────────────────────────
  async function handleOAuth(provider) {
    reset(); setOauthProvider(provider); setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/auth/callback' }
    });
    if (error) { setLoading(false); showMsg('No se pudo iniciar la autenticación.', true); }
    // Si no hay error, Supabase redirige al proveedor automáticamente en PWA
    // El usuario regresa y onAuthStateChange captura la sesión
  }

  // ── Email/password ─────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault(); reset();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showMsg(translateError(error), true);
    else onAuth(data.session);
  }

  async function handleSignUp(e) {
    e.preventDefault(); reset();
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length) { showMsg(pwdErrors[0], true); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) showMsg(translateError(error), true);
    else if (!data.session) showMsg('Revisa tu email para confirmar tu cuenta.');
    else onAuth(data.session);
  }

  async function handleForgot(e) {
    e.preventDefault(); reset();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setLoading(false);
    if (error) showMsg(translateError(error), true);
    else showMsg('Si el email existe, recibirás instrucciones.');
  }

  function translateError(e) {
    const m = e.message?.toLowerCase() || '';
    if (m.includes('invalid login')) return 'Email o contraseña incorrectos.';
    if (m.includes('already registered')) return 'Ya existe una cuenta con ese email.';
    if (m.includes('email not confirmed')) return 'Confirma tu email primero.';
    return e.message;
  }

  const providerLabel = { google: 'Google', github: 'GitHub', azure: 'Microsoft' };

  // ── Orbs de fondo ──────────────────────────────────────────────────────────
  const orbs = (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top:'-100px', left:'-80px', animation:'orb-move 12s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom:'5%', right:'-60px', animation:'orb-move 16s ease-in-out infinite reverse' }}/>
    </div>
  );

  return (
    <div className="pwa-auth">
      {orbs}

      <div className="pwa-auth-card">
      {/* Logo */}
      <div className="pwa-auth-logo-wrap">
        <img src="/logo-fluxor.png" alt="FluXor" className="pwa-auth-logo-img" />
      </div>

      {/* OAuth pending (solo informativo — en PWA la redirección es automática) */}
      {loading && oauthProvider && (
        <div style={{ textAlign:'center', zIndex:1 }}>
          <div className="pwa-spinner" style={{ margin:'0 auto 12px' }} />
          <p style={{ fontSize:13, color:'var(--muted)' }}>Redirigiendo a {providerLabel[oauthProvider]}…</p>
        </div>
      )}

      {/* Pantalla principal */}
      {!loading && mode === 'main' && (
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:12, zIndex:1 }}>
          <p className="pwa-auth-sub" style={{ marginBottom:4 }}>Sincroniza tus finanzas en todos tus dispositivos</p>

          {msg && <p className="pwa-error" style={{ color: isError ? 'var(--red)' : 'var(--green)', textAlign:'center', fontSize:13 }}>{msg}</p>}

          <button className="pwa-oauth-btn" onClick={() => handleOAuth('google')}>
            <IconGoogle /> Continuar con Google
          </button>
          <button className="pwa-oauth-btn" onClick={() => handleOAuth('github')}>
            <IconGitHub /> Continuar con GitHub
          </button>
          <button className="pwa-oauth-btn" onClick={() => handleOAuth('azure')}>
            <IconMicrosoft /> Continuar con Microsoft
          </button>

          <div className="pwa-auth-divider"><span>o</span></div>

          <button className="pwa-oauth-btn pwa-oauth-email" onClick={() => { reset(); setMode('email'); }}>
            <IconMail /> Continuar con email
          </button>
        </div>
      )}

      {/* Login email */}
      {mode === 'email' && (
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:14, zIndex:1 }}>
          <button className="pwa-auth-back" onClick={() => { reset(); setMode('main'); }}>← Volver</button>
          <p className="pwa-auth-sub">Usa tu email y contraseña de FluXor</p>
          <form className="pwa-auth-form" onSubmit={handleSignIn} style={{ gap:12 }}>
            <div className="pwa-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" required />
            </div>
            <div className="pwa-field">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            </div>
            {msg && <p className="pwa-error" style={{ color: isError ? 'var(--red)' : 'var(--green)' }}>{msg}</p>}
            <button type="submit" className="pwa-submit" disabled={loading}>{loading ? 'Un momento…' : 'Iniciar sesión'}</button>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
              <button type="button" className="pwa-auth-toggle" onClick={() => { reset(); setMode('forgot'); }}>Olvidé mi contraseña</button>
              <button type="button" className="pwa-auth-toggle" onClick={() => { reset(); setMode('signup'); }}>Crear cuenta</button>
            </div>
          </form>
        </div>
      )}

      {/* Registro */}
      {mode === 'signup' && (
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:14, zIndex:1 }}>
          <button className="pwa-auth-back" onClick={() => { reset(); setMode('email'); }}>← Volver</button>
          <p className="pwa-auth-sub">Crea tu cuenta gratuita de FluXor</p>
          <form className="pwa-auth-form" onSubmit={handleSignUp} style={{ gap:12 }}>
            <div className="pwa-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" required />
            </div>
            <div className="pwa-field">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
              <PasswordStrengthBar password={password} />
              {password && validatePassword(password).length > 0 && (
                <p style={{ fontSize:11, color:'var(--muted)', margin:'4px 0 0' }}>
                  Necesitas: {validatePassword(password).join(' · ')}
                </p>
              )}
            </div>
            {msg && <p className="pwa-error" style={{ color: isError ? 'var(--red)' : 'var(--green)' }}>{msg}</p>}
            <button type="submit" className="pwa-submit" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
            <button type="button" className="pwa-auth-toggle" onClick={() => { reset(); setMode('email'); }}>Ya tengo cuenta</button>
          </form>
        </div>
      )}

      {/* Recuperar contraseña */}
      {mode === 'forgot' && (
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:14, zIndex:1 }}>
          <button className="pwa-auth-back" onClick={() => { reset(); setMode('email'); }}>← Volver</button>
          <p className="pwa-auth-sub">Te enviaremos instrucciones al correo</p>
          <form className="pwa-auth-form" onSubmit={handleForgot} style={{ gap:12 }}>
            <div className="pwa-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            {msg && <p className="pwa-error" style={{ color: isError ? 'var(--red)' : 'var(--green)' }}>{msg}</p>}
            <button type="submit" className="pwa-submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar instrucciones'}</button>
          </form>
        </div>
      )}
      </div>{/* /pwa-auth-card */}
    </div>
  );
}


// ── UserSheet — Panel de perfil/sesión ───────────────────────────────────────
function UserSheet({ session, onClose, onSignOut }) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    onSignOut();
  }

  const email = session?.user?.email || '';
  const provider = session?.user?.app_metadata?.provider || 'email';
  const providerLabel = { google: 'Google', github: 'GitHub', azure: 'Microsoft', email: 'Email' };

  return (
    <div className="pwa-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pwa-sheet">
        <div className="pwa-sheet-handle" />

        <div style={{ display:'flex', flexDirection:'column', gap:20, padding:'8px 0' }}>
          {/* Avatar + info */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:52, height:52, borderRadius:'50%',
              background:'linear-gradient(135deg,#818cf8,#c084fc)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, fontWeight:700, color:'#fff', flexShrink:0
            }}>
              {email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:15 }}>{email}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                Cuenta {providerLabel[provider] || provider}
              </div>
            </div>
          </div>

          <div style={{ height:1, background:'var(--border)' }} />

          {/* Info de sesión */}
          <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
            <div>Tus datos se sincronizan automáticamente entre todos tus dispositivos.</div>
          </div>

          <div style={{ height:1, background:'var(--border)' }} />

          {/* Cerrar sesión */}
          <button
            onClick={handleSignOut}
            disabled={loading}
            style={{
              width:'100%', padding:'13px', borderRadius:12,
              background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
              color:'#f87171', fontSize:14, fontWeight:600, cursor:'pointer',
              transition:'background 150ms'
            }}
          >
            {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>

          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'11px', borderRadius:12,
              background:'transparent', border:'1px solid var(--border)',
              color:'var(--muted)', fontSize:14, cursor:'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MovementSheet — Formulario de movimiento en PWA ─────────────────────────
const CURRENCIES_PWA = [
  { code: 'MXN', symbol: '$'  },
  { code: 'USD', symbol: '$'  },
  { code: 'EUR', symbol: '€'  },
  { code: 'GBP', symbol: '£'  },
  { code: 'CAD', symbol: '$'  },
  { code: 'JPY', symbol: '¥'  },
  { code: 'BRL', symbol: 'R$' },
  { code: 'ARS', symbol: '$'  },
];

function MovementSheet({ tipo, userId, cards = [], selectedMonth, onSave, onClose }) {
  const today = () => new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    monto: '', categoria: '', metodo: 'efectivo',
    fuente: '', fecha: today(), moneda: 'MXN', tipo_cambio: ''
  });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);
  const prevMoneda = useRef('MXN');

  const esMXN = form.moneda === 'MXN';
  const tcNum = esMXN ? 1 : (Number(form.tipo_cambio) || 0);
  const montoNum = Number(form.monto) || 0;
  const montoMXN = esMXN ? montoNum : montoNum * tcNum;
  const showPreview = !esMXN && montoNum > 0 && tcNum > 0;

  const creditCards = cards.filter(c => c.tipo === 'credito');
  const debitCards  = cards.filter(c => c.tipo === 'debito');
  const availableCards = form.metodo === 'tarjeta'
    ? [...creditCards, ...debitCards]
    : [];

  const typeLabel = { gasto: 'Gasto', ingreso: 'Ingreso', pendiente: 'Pendiente', transferencia: 'Transferencia' };

  // Auto-fetch tipo de cambio
  useEffect(() => {
    if (esMXN || form.moneda === prevMoneda.current) return;
    prevMoneda.current = form.moneda;
    setFetchingRate(true);
    supabase.functions.invoke('get-exchange-rate', {
      body: { from: form.moneda, to: 'MXN' }
    }).then(({ data }) => {
      setFetchingRate(false);
      if (data?.rate) setForm(f => ({ ...f, tipo_cambio: String(Number(data.rate).toFixed(4)) }));
    }).catch(async () => {
      // Fallback: Frankfurter API directamente
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${form.moneda}&to=MXN`);
        const json = await res.json();
        if (json.rates?.MXN) setForm(f => ({ ...f, tipo_cambio: String(Number(json.rates.MXN).toFixed(4)) }));
      } catch { /* sin internet */ }
      setFetchingRate(false);
    });
  }, [form.moneda, esMXN]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) { setError('Ingresa un monto válido.'); return; }
    if (!form.categoria.trim()) { setError('Ingresa una categoría.'); return; }
    if (!esMXN && !form.tipo_cambio) { setError('Ingresa el tipo de cambio.'); return; }
    setSaving(true); setError('');

    const montoFinal = esMXN ? Number(form.monto) : Math.round(montoMXN * 100) / 100;

    const { error: err } = await supabase.from('movimientos').insert({
      user_id:        userId,
      tipo,
      monto:          montoFinal,
      categoria:      form.categoria.trim(),
      metodo:         form.metodo,
      fuente:         form.fuente || null,
      fecha:          form.fecha,
      estado:         'activo',
      recurrente:     0,
      moneda:         form.moneda,
      monto_original: esMXN ? null : Number(form.monto),
      tipo_cambio:    esMXN ? 1 : Number(form.tipo_cambio),
      synced_at:      new Date().toISOString(),
      sync_id:        crypto.randomUUID(),
    });

    setSaving(false);
    if (err) { setError('Error al guardar. Intenta de nuevo.'); return; }
    onSave();
  }

  const selectedCurrency = CURRENCIES_PWA.find(c => c.code === form.moneda) || CURRENCIES_PWA[0];

  return (
    <div className="pwa-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pwa-sheet">
        <div className="pwa-sheet-handle" />
        <div className="pwa-sheet-header">
          <h3 className="pwa-sheet-title">Nuevo {typeLabel[tipo]}</h3>
          <button className="pwa-sheet-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Moneda + Monto */}
          <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <div style={{ flex:'none', position:'relative' }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Moneda</label>
              <button type="button" className="pwa-currency-btn" onClick={() => setShowCurrencies(s => !s)}>
                <span style={{ fontWeight:700 }}>{selectedCurrency.code}</span>
                <span style={{ color:'var(--muted)', fontSize:11 }}>{selectedCurrency.symbol}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showCurrencies && (
                <div className="pwa-currency-dropdown">
                  {CURRENCIES_PWA.map(c => (
                    <button key={c.code} type="button"
                      className={`pwa-currency-option ${c.code === form.moneda ? 'active' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, moneda: c.code, tipo_cambio: '' })); prevMoneda.current = ''; setShowCurrencies(false); }}>
                      <span style={{ fontWeight:700 }}>{c.code}</span>
                      <span style={{ color:'var(--muted)', fontSize:12 }}>{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>
                Monto {esMXN ? '(MXN)' : `(${form.moneda})`}
              </label>
              <input className="pwa-input" type="number" min="0" step="0.01"
                value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0.00" required />
            </div>
          </div>

          {/* Tipo de cambio */}
          {!esMXN && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>
                Tipo de cambio (1 {form.moneda} = ? MXN)
                {fetchingRate && <span style={{ color:'var(--accent)', marginLeft:6, fontSize:11 }}> ⟳ Consultando…</span>}
              </label>
              <input className="pwa-input" type="number" min="0" step="0.0001"
                value={form.tipo_cambio} onChange={e => setForm(f => ({ ...f, tipo_cambio: e.target.value }))}
                placeholder={fetchingRate ? 'Obteniendo…' : 'Ej: 17.25'}
                disabled={fetchingRate} required />
              {showPreview && (
                <p style={{ fontSize:12, color:'var(--accent)', margin:'6px 0 0' }}>
                  ≈ {MXN(montoMXN)} MXN
                </p>
              )}
            </div>
          )}

          {/* Categoría */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Categoría</label>
            <input className="pwa-input" type="text" value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              placeholder="Ej: Comida, Sueldo, Netflix…" required />
          </div>

          {/* Método */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Método de pago</label>
            <div style={{ display:'flex', gap:8 }}>
              {['efectivo','tarjeta'].map(m => (
                <button key={m} type="button"
                  className={`pwa-method-btn ${form.metodo === m ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, metodo: m, fuente: '' }))}>
                  {m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta */}
          {form.metodo === 'tarjeta' && availableCards.length > 0 && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Tarjeta</label>
              <select className="pwa-input" value={form.fuente} onChange={e => setForm(f => ({ ...f, fuente: e.target.value }))}>
                <option value="">Sin especificar</option>
                {availableCards.map(c => (
                  <option key={c.id || c.nombre} value={c.nombre}>{c.nombre} ({c.tipo})</option>
                ))}
              </select>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Fecha</label>
            <input className="pwa-input" type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>

          {error && <p style={{ color:'var(--red,#f87171)', fontSize:13, margin:0 }}>{error}</p>}

          <button type="submit" className="pwa-submit" disabled={saving} style={{ marginTop:4 }}>
            {saving ? 'Guardando…' : `Agregar ${typeLabel[tipo]}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Periodo financiero (igual lógica que la app de escritorio) ────────────────
function getFinancialPeriod(monthKey, cutoff) {
  const [year, month] = monthKey.split('-').map(Number);
  const safeCutoff = Math.max(1, Math.min(Number(cutoff || 1), 28));
  if (safeCutoff === 1) {
    return {
      start: `${year}-${String(month).padStart(2,'0')}-01`,
      end:   `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`
    };
  }
  const startDate = new Date(year, month - 2, safeCutoff);
  const endDate   = new Date(year, month - 1, safeCutoff - 1);
  const fmt = d => d.toISOString().slice(0, 10);
  return { start: fmt(startDate), end: fmt(endDate) };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [metrics, setMetrics] = useState({ ingresos: 0, gastos: 0, balance: 0 });
  const [activeSheet, setActiveSheet] = useState(null); // null | tipo | 'user'
  const [refreshKey, setRefreshKey] = useState(0);
  const [cutoffDay, setCutoffDay] = useState(1); // día de corte leído de Supabase
  const [recoveryMode, setRecoveryMode] = useState(false); // true cuando viene del link de reset

  // Cargar día de corte desde Supabase
  // Restaurar sesión + detectar token de recovery en la URL
  useEffect(() => {
    // Detectar si venimos del link de "Restablecer contraseña"
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Supabase pone el access_token en el hash — lo procesamos
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          setRecoveryMode(true); // mostrar formulario de nueva contraseña
        }
        setLoading(false);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cargar movimientos del mes actual respetando el día de corte
  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;
    const month = selectedMonth;

    // Leer dia_corte via RPC (SECURITY DEFINER, evita problemas de RLS)
    // Solo se lee una vez — después queda en estado y no vuelve a disparar
    if (cutoffDay === 1) {
      try {
        const { data: rpcVal } = await supabase.rpc('get_dia_corte');
        if (rpcVal != null) {
          const val = Number(rpcVal);
          if (val >= 2 && val <= 28) {
            setCutoffDay(val);
            return; // re-render automático con el valor correcto
          }
        }
      } catch { /* usa default 1 */ }
    }

    const period = getFinancialPeriod(month, cutoffDay);

    const { data } = await supabase
      .from('movimientos')
      .select('*')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .gte('fecha', period.start)
      .lte('fecha', period.end)
      .order('fecha', { ascending: false })
      .limit(50);

    const { data: cardData } = await supabase
      .from('tarjetas')
      .select('*')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .order('nombre', { ascending: true });

    if (data) {
      setMovements(data);
      const ingresos  = data.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
      const gastos    = data.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
      setMetrics({ ingresos, gastos, balance: ingresos - gastos });
    }
    if (cardData) setCards(cardData);
  }, [session, selectedMonth, cutoffDay]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  function handleSave() {
    setActiveSheet(null);
    setRefreshKey(k => k + 1);
  }

  if (loading) return <div className="pwa-shell"><div className="pwa-spinner" /></div>;
  if (!session) return <div className="pwa-shell"><AuthScreen onAuth={setSession} /></div>;
  if (recoveryMode) return (
    <div className="pwa-shell">
      <ResetPasswordScreen
        onDone={() => {
          setRecoveryMode(false);
          // Limpiar el hash de la URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    </div>
  );

  const period = getFinancialPeriod(selectedMonth, cutoffDay);
  // Etiqueta del periodo: si hay día de corte, muestra rango "25 abr – 25 may"
  const month = (() => {
    if (cutoffDay <= 1) {
      return new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    }
    const fmt = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const [y, m] = selectedMonth.split('-').map(Number);
    const labelYear = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return `${labelYear}  (${fmt(period.start)} – ${fmt(period.end)})`;
  })();

  return (
    <div className="pwa-shell">
      {/* Animated background orbs */}
      <div aria-hidden="true" style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden'
      }}>
        <div style={{
          position:'absolute', width:340, height:340, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)',
          top:'-80px', left:'-60px', animation:'orb-move 12s ease-in-out infinite'
        }}/>
        <div style={{
          position:'absolute', width:280, height:280, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
          bottom:'10%', right:'-60px', animation:'orb-move 15s ease-in-out infinite reverse'
        }}/>
        <div style={{
          position:'absolute', width:200, height:200, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          top:'45%', left:'30%', animation:'orb-move 18s ease-in-out infinite 3s'
        }}/>
      </div>
      {/* Header */}
      <header className="pwa-header">
        <div>
          <div className="pwa-header-title">FluXor</div>
          <input className="pwa-month-picker" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} aria-label="Mes" />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, textTransform: 'capitalize' }}>{month}</div>
        </div>
        <div className="pwa-header-right">
          <button className="pwa-user-btn" onClick={() => setActiveSheet('user')} title="Mi cuenta">
            {Ico.user}
          </button>
        </div>
      </header>

      {/* Métricas */}
      <div className="pwa-metrics">
        <div className="pwa-metric">
          <div className="pwa-metric-label">Ingresos</div>
          <div className="pwa-metric-value income">{MXN(metrics.ingresos)}</div>
        </div>
        <div className="pwa-metric">
          <div className="pwa-metric-label">Gastos</div>
          <div className="pwa-metric-value expense">{MXN(metrics.gastos)}</div>
        </div>
        <div className="pwa-metric" style={{ gridColumn: '1 / -1' }}>
          <div className="pwa-metric-label">Balance del mes</div>
          <div className="pwa-metric-value balance" style={{ color: metrics.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {MXN(metrics.balance)}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="pwa-actions">
        {Object.entries(TYPE_META).map(([tipo, meta]) => (
          <button key={tipo} className={`pwa-action-btn ${meta.cls}`} onClick={() => setActiveSheet(tipo)}>
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* Lista de movimientos */}
      <div className="pwa-movements">
        <div className="pwa-movements-title">Movimientos del mes</div>
        {movements.length === 0 && (
          <div className="pwa-empty">Sin movimientos este mes.<br />Usa los botones de arriba para registrar.</div>
        )}
        {movements.map((m) => {
          const meta = TYPE_META[m.tipo] || TYPE_META.gasto;
          const sign = m.tipo === 'gasto' ? '-' : m.tipo === 'ingreso' ? '+' : '';
          return (
            <div key={m.sync_id || m.id} className="pwa-movement-row">
              <div className={`pwa-movement-icon ${meta.cls}`}>{meta.icon}</div>
              <div className="pwa-movement-info">
                <div className="pwa-movement-cat">{m.categoria || '—'}</div>
                <div className="pwa-movement-meta">
                  {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  {m.metodo ? ` · ${m.metodo}` : ''}
                </div>
              </div>
              <div className={`pwa-movement-amount ${meta.cls}`}>
                {sign}{MXN(m.monto)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sheets */}
      {activeSheet && activeSheet !== 'user' && (
        <MovementSheet
          tipo={activeSheet}
          userId={session.user.id}
          cards={cards}
          selectedMonth={selectedMonth}
          onSave={handleSave}
          onClose={() => setActiveSheet(null)}
        />
      )}
      {activeSheet === 'user' && (
        <UserSheet
          session={session}
          onClose={() => setActiveSheet(null)}
          onSignOut={() => { setSession(null); setActiveSheet(null); }}
        />
      )}
    </div>
  );
}
