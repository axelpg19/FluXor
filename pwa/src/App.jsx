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
    if (password.length < 8) { showMsg('Mínimo 8 caracteres en la contraseña.', true); return; }
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
              <label>Contraseña (mín. 8 caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
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

  // Cargar día de corte desde Supabase
  // Restaurar sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);

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
