'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import Modal from '@/components/Modal';
import { api, fmt, todayStr } from '@/lib/api';

const pad = (n) => String(n).padStart(2, '0');
const ds = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarPage() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [modal, setModal] = useState(null);
  const [warn, setWarn] = useState(null);
  const [error, setError] = useState('');

  const load = () => Promise.all([api('/api/admin/bookings'), api('/api/admin/blocks')])
    .then(([b, k]) => { setBookings(b.bookings); setBlocks(k.blocks); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(new Date(ym.y, ym.m, 1 - (startDow - i)));
  for (let d = 1; d <= dim; d++) cells.push(new Date(ym.y, ym.m, d));
  while (cells.length % 7) cells.push(new Date(ym.y, ym.m + 1, cells.length - startDow - dim + 1));

  const today = todayStr();
  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const move = (n) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <Shell title="Calendar & Blocks" actions={<button className="btn" onClick={() => setModal(true)}>+ Block dates</button>}>
      {error && <div className="err">{error}</div>}
      <p className="muted" style={{ marginTop: -8 }}>Blocked dates (maintenance, holidays, days off) are published to your booking system through <code>/api/availability</code>, so customers can no longer book them.</p>
      {warn && warn.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--red)', marginBottom: 14 }}>
          <strong>Dates blocked — but {warn.length} existing booking(s) fall inside the range:</strong>
          {warn.map((b) => <div key={b.id} className="muted">{fmt(b.service_date)} · {b.customer_name} · {b.service}</div>)}
          <div className="muted" style={{ marginTop: 6 }}>Go to Bookings to cancel them (the client will be notified) or reschedule.</div>
        </div>
      )}
      <div className="head" style={{ marginBottom: 10 }}>
        <div className="actions"><button className="btn alt" onClick={() => move(-1)}>‹</button><button className="btn alt" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Today</button><button className="btn alt" onClick={() => move(1)}>›</button></div>
        <h2>{label}</h2>
      </div>
      <div className="cal">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="dow">{d}</div>)}
        {cells.map((c) => {
          const s = ds(c.getFullYear(), c.getMonth(), c.getDate());
          const blk = blocks.find((k) => k.start_date <= s && k.end_date >= s);
          const items = bookings.filter((b) => b.service_date === s);
          return (
            <div key={s} className={'day' + (c.getMonth() !== ym.m ? ' out' : '') + (blk ? ' blocked' : '') + (s === today ? ' today' : '')}>
              <div className="dn">{c.getDate()}</div>
              {blk && <div className="muted" style={{ color: 'var(--red)' }}>⛔ {blk.reason || 'Blocked'}</div>}
              {items.slice(0, 3).map((b) => <span key={b.id} className={'chip ' + b.status}>{b.start_time || ''} {b.customer_name}</span>)}
              {items.length > 3 && <div className="muted">+{items.length - 3} more</div>}
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: '26px 0 10px' }}>Blocked periods</h3>
      <div className="tablewrap"><table>
        <thead><tr><th>From</th><th>To</th><th>Reason</th><th></th></tr></thead>
        <tbody>
          {blocks.length === 0 && <tr><td colSpan="4" className="empty">No blocked dates.</td></tr>}
          {blocks.map((k) => (
            <tr key={k.id}><td>{fmt(k.start_date)}</td><td>{fmt(k.end_date)}</td><td>{k.reason}</td>
              <td><button className="btn alt sm" onClick={async () => { await api('/api/admin/blocks?id=' + k.id, { method: 'DELETE' }); load(); }}>Unblock</button></td></tr>
          ))}
        </tbody>
      </table></div>

      {modal && <BlockForm onClose={() => setModal(null)} onSaved={(clashes) => { setModal(null); setWarn(clashes); load(); }} />}
    </Shell>
  );
}

function BlockForm({ onClose, onSaved }) {
  const [f, setF] = useState({ start_date: todayStr(), end_date: todayStr(), reason: 'Maintenance' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { const d = await api('/api/admin/blocks', { method: 'POST', body: f }); onSaved(d.clashes); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  }
  return (
    <Modal title="Block dates" onClose={onClose}>
      <form onSubmit={save}>
        <div className="grid2">
          <div><label>From</label><input type="date" required value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value, end_date: f.end_date < e.target.value ? e.target.value : f.end_date })} /></div>
          <div><label>To</label><input type="date" required min={f.start_date} value={f.end_date} onChange={set('end_date')} /></div>
        </div>
        <label>Reason (internal only)</label><input value={f.reason} onChange={set('reason')} />
        {err && <div className="err">{err}</div>}
        <div className="actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className="btn alt" onClick={onClose}>Close</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Block dates'}</button>
        </div>
      </form>
    </Modal>
  );
}
