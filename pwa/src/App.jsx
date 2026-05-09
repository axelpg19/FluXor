import { useState, useEffect, useCallback } from 'react';
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

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  function showMsg(text, error = false) { setMsg(text); setIsError(error); }

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showMsg(translateError(error), true);
    else onAuth(data.session);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (password.length < 8) { showMsg('La contraseña debe tener al menos 8 caracteres.', true); return; }
    setLoading(true); setMsg('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) showMsg(translateError(error), true);
    else if (!data.session) showMsg('Revisa tu email para confirmar tu cuenta.');
    else onAuth(data.session);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
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

  const handler = mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleForgot;

  return (
    <div className="pwa-auth">
      <div className="pwa-auth-logo">FluXor</div>
      <p className="pwa-auth-sub">
        {mode === 'signin' ? 'Inicia sesión para sincronizar tus finanzas' :
         mode === 'signup' ? 'Crea tu cuenta gratuita de FluXor' :
         'Recupera el acceso a tu cuenta'}
      </p>

      <form className="pwa-auth-form" onSubmit={handler}>
        <div className="pwa-field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" autoComplete="email" required />
        </div>
        {mode !== 'forgot' && (
          <div className="pwa-field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
          </div>
        )}
        {msg && <p className="pwa-error" style={{ color: isError ? 'var(--red)' : 'var(--green)' }}>{msg}</p>}
        <button type="submit" className="pwa-submit" disabled={loading}>
          {loading ? 'Un momento…' :
           mode === 'signin' ? 'Iniciar sesión' :
           mode === 'signup' ? 'Crear cuenta' : 'Enviar instrucciones'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {mode === 'signin' && <>
          <button className="pwa-auth-toggle" onClick={() => { setMsg(''); setMode('signup'); }}>¿Sin cuenta? Regístrate gratis</button>
          <button className="pwa-auth-toggle" onClick={() => { setMsg(''); setMode('forgot'); }}>Olvidé mi contraseña</button>
        </>}
        {mode !== 'signin' && (
          <button className="pwa-auth-toggle" onClick={() => { setMsg(''); setMode('signin'); }}>← Volver a iniciar sesión</button>
        )}
      </div>
    </div>
  );
}

// ── Bottom Sheet de movimiento ────────────────────────────────────────────────

function MovementSheet({ tipo, userId, cards, selectedMonth, onSave, onClose }) {
  const meta = TYPE_META[tipo];
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [metodo, setMetodo] = useState(tipo === 'transferencia' ? 'transferencia' : 'efectivo');
  const [subtipo, setSubtipo] = useState('debito');
  const [fuente, setFuente] = useState('');
  const [destino, setDestino] = useState('');
  const [month, setMonth] = useState(selectedMonth || thisMonth());
  const [fecha, setFecha] = useState(() => {
    const day = today().slice(8, 10);
    return `${selectedMonth || thisMonth()}-${day}`;
  });
  const [msiActivo, setMsiActivo] = useState(false);
  const [meses, setMeses] = useState('3');
  const [conIntereses, setConIntereses] = useState(false);
  const [tasaInteres, setTasaInteres] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cardOptions = cards.filter(c => !subtipo || c.tipo === subtipo);
  const creditCards = cards.filter(c => c.tipo === 'credito');

  function handleMonthChange(value) {
    setMonth(value);
    const day = fecha.slice(8, 10) || '01';
    const daysInMonth = new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 0).getDate();
    setFecha(`${value}-${String(Math.min(Number(day), daysInMonth)).padStart(2, '0')}`);
  }

  async function ensureCard(nombre, tipoTarjeta) {
    const clean = String(nombre || '').trim();
    if (!clean || !tipoTarjeta) return;
    const exists = cards.some(c => c.nombre.toLowerCase() === clean.toLowerCase() && c.tipo === tipoTarjeta);
    if (exists) return;
    await supabase.from('tarjetas').insert([{
      user_id: userId,
      nombre: clean,
      tipo: tipoTarjeta,
      estado: tipoTarjeta === 'credito' ? 'pendiente' : 'pagado',
      sync_id: uid(),
      synced_at: new Date().toISOString()
    }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!categoria.trim()) { setError('Escribe una categoría o descripción.'); return; }
    if (tipo === 'transferencia' && !fuente.trim()) { setError('Selecciona o escribe la cuenta origen.'); return; }
    if (metodo === 'tarjeta' && !fuente.trim()) { setError('Selecciona o escribe la tarjeta.'); return; }
    if (msiActivo && (!Number(meses) || Number(meses) < 2)) { setError('Los meses deben ser 2 o más.'); return; }

    setLoading(true);
    const now = new Date().toISOString();
    let rows;
    if (msiActivo && tipo === 'gasto') {
      const numMeses = Math.round(Number(meses));
      const tasa = conIntereses ? Number(tasaInteres || 0) / 100 : 0;
      const mensual = Number(((montoNum * (1 + tasa)) / numMeses).toFixed(2));
      const [year, monthNum, day] = fecha.split('-').map(Number);
      const grupoMsi = `msi-${Date.now()}`;
      rows = Array.from({ length: numMeses }, (_, index) => {
        const d = new Date(year, monthNum - 1 + index, day);
        const cuotaFecha = d.toISOString().slice(0, 10);
        return {
          user_id: userId,
          sync_id: uid(),
          tipo: 'gasto',
          monto: mensual,
          categoria: `${categoria.trim()} (${index + 1}/${numMeses})`,
          metodo: 'tarjeta',
          subtipo: 'credito',
          fuente: fuente.trim(),
          destino: null,
          fecha: cuotaFecha,
          estado: 'activo',
          recurrente: 0,
          grupo_msi: grupoMsi,
          moneda: 'MXN',
          tipo_cambio: 1,
          synced_at: now
        };
      });
    } else {
      rows = [{
        user_id: userId,
        sync_id: uid(),
        tipo,
        monto: montoNum,
        categoria: categoria.trim(),
        metodo: tipo === 'transferencia' ? 'transferencia' : metodo,
        subtipo: metodo === 'tarjeta' ? subtipo : null,
        fuente: (metodo === 'tarjeta' || tipo === 'transferencia') ? fuente.trim() : null,
        destino: tipo === 'transferencia' ? (destino.trim() || null) : null,
        fecha,
        estado: 'activo',
        recurrente: 0,
        moneda: 'MXN',
        tipo_cambio: 1,
        synced_at: now
      }];
    }

    if (metodo === 'tarjeta' || msiActivo) await ensureCard(fuente, msiActivo ? 'credito' : subtipo);
    if (tipo === 'transferencia' && fuente) await ensureCard(fuente, 'debito');

    const { error: err } = await supabase.from('movimientos').insert(rows);
    setLoading(false);
    if (err) { setError('Error al guardar. Intenta de nuevo.'); return; }
    onSave();
  }

  return (
    <>
      <div className="pwa-sheet-overlay" onClick={onClose} />
      <div className="pwa-sheet">
        <div className="pwa-sheet-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="pwa-sheet-title" style={{ color: meta.color, margin: 0 }}>
            <span style={{ marginRight: 8 }}>{meta.icon}</span>{meta.label}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            {Ico.x}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Monto grande */}
          <div className="pwa-field">
            <label>Monto</label>
            <input
              type="number" inputMode="decimal" min="0.01" step="0.01"
              value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="0.00" autoFocus
            />
          </div>
          {monto && Number(monto) > 0 && (
            <div className="pwa-amount-preview" style={{ color: meta.color }}>
              {MXN(monto)}
            </div>
          )}

          <div className="pwa-field">
            <label>Descripción / Categoría</label>
            <input
              type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
              placeholder={tipo === 'gasto' ? 'Tacos, renta, gasolina…' :
                           tipo === 'ingreso' ? 'Sueldo, freelance…' :
                           tipo === 'pendiente' ? 'Juan, préstamo amigo…' : 'Descripción'}
            />
          </div>

          <div className="pwa-field-row">
            <div className="pwa-field">
              <label>Mes</label>
              <input type="month" value={month} onChange={e => handleMonthChange(e.target.value)} />
            </div>

            <div className="pwa-field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>

          {tipo !== 'pendiente' && tipo !== 'transferencia' && (
            <div className="pwa-field">
              <label>Método de pago</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
          )}

          {metodo === 'tarjeta' && tipo !== 'transferencia' && (
            <>
              <div className="pwa-field">
                <label>Tipo de tarjeta</label>
                <select value={subtipo} onChange={e => { setSubtipo(e.target.value); setFuente(''); setMsiActivo(false); }}>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              <div className="pwa-field">
                <label>Tarjeta</label>
                <input list="pwa-cards" value={fuente} onChange={e => setFuente(e.target.value)} placeholder="BBVA, Nu, Hey..." />
                <datalist id="pwa-cards">{cardOptions.map(c => <option key={c.sync_id || c.id || c.nombre} value={c.nombre} />)}</datalist>
              </div>
            </>
          )}

          {tipo === 'gasto' && metodo === 'tarjeta' && subtipo === 'credito' && (
            <div className="pwa-msi-box">
              <label className="pwa-check"><input type="checkbox" checked={msiActivo} onChange={e => setMsiActivo(e.target.checked)} /> Pago a meses</label>
              {msiActivo && <>
                <div className="pwa-field"><label>Meses</label><input type="number" min="2" max="60" value={meses} onChange={e => setMeses(e.target.value)} /></div>
                <label className="pwa-check"><input type="checkbox" checked={conIntereses} onChange={e => setConIntereses(e.target.checked)} /> Con intereses</label>
                {conIntereses && <div className="pwa-field"><label>Tasa %</label><input type="number" min="0" step="0.01" value={tasaInteres} onChange={e => setTasaInteres(e.target.value)} /></div>}
              </>}
            </div>
          )}

          {tipo === 'transferencia' && (
            <>
              <div className="pwa-field"><label>Origen</label><input list="pwa-transfer-cards" value={fuente} onChange={e => setFuente(e.target.value)} placeholder="Cuenta o tarjeta origen" /></div>
              <div className="pwa-field"><label>Destino</label><input value={destino} onChange={e => setDestino(e.target.value)} placeholder="Cuenta destino" /></div>
              <datalist id="pwa-transfer-cards">{cards.filter(c => c.tipo === 'debito').map(c => <option key={c.sync_id || c.id || c.nombre} value={c.nombre} />)}</datalist>
            </>
          )}

          {error && <p className="pwa-error">{error}</p>}

          <button type="submit" className="pwa-submit" disabled={loading}>
            {loading ? 'Guardando…' : `Guardar ${meta.label}`}
          </button>
        </form>
      </div>
    </>
  );
}

// ── User Menu Sheet ───────────────────────────────────────────────────────────

function UserSheet({ session, onClose, onSignOut }) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut();
  }
  return (
    <>
      <div className="pwa-sheet-overlay" onClick={onClose} />
      <div className="pwa-sheet">
        <div className="pwa-sheet-handle" />
        <h2 className="pwa-sheet-title">Mi cuenta</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Email</strong>
          {session.user.email}
        </div>
        <button type="button" className="pwa-submit" style={{ background: 'var(--surface)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.3)' }} onClick={handleSignOut}>
          Cerrar sesión
        </button>
        <button type="button" className="pwa-submit" style={{ background: 'none', color: 'var(--muted)', marginTop: 10 }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [metrics, setMetrics] = useState({ ingresos: 0, gastos: 0, balance: 0 });
  const [activeSheet, setActiveSheet] = useState(null); // null | tipo | 'user'
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Cargar movimientos del mes actual
  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;
    const month = selectedMonth;
    const { data } = await supabase
      .from('movimientos')
      .select('*')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .gte('fecha', `${month}-01`)
      .lte('fecha', `${month}-31`)
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
  }, [session, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  function handleSave() {
    setActiveSheet(null);
    setRefreshKey(k => k + 1);
  }

  if (loading) return <div className="pwa-shell"><div className="pwa-spinner" /></div>;
  if (!session) return <div className="pwa-shell"><AuthScreen onAuth={setSession} /></div>;

  const month = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="pwa-shell">
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
