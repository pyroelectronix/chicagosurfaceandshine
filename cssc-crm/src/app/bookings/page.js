'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import Modal from '@/components/Modal';
import { api, fmt, money, todayStr } from '@/lib/api';

const SERVICES = ['Standard Cleaning', 'Deep Cleaning', 'Move-in / Move-out Cleaning', 'Office Cleaning', 'Post-Construction Cleaning', 'Window Cleaning', 'Other'];
const blank = { customer_name: '', customer_email: '', customer_phone: '', service: SERVICES[0], service_date: todayStr(), start_time: '', duration_hours: '', address: '', price: '', notes: '', send_notification: true };

export default function Bookings() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(null); // {type:'new'|'edit'|'cancel'|'delete', booking?}
  const [error, setError] = useState('');

  const load = () => api('/api/admin/bookings').then((d) => setRows(d.bookings)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((b) =>
    (status === 'all' || b.status === status) &&
    (!q || [b.customer_name, b.customer_email, b.customer_phone, b.service].join(' ').toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => b.service_date.localeCompare(a.service_date)), [rows, q, status]);

  return (
    <Shell title="Bookings" actions={<button className="btn" onClick={() => setModal({ type: 'new' })}>+ New booking</button>}>
      {error && <div className="err">{error}</div>}
      <div className="toolbar">
        <input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th>Date</th><th>Customer</th><th>Service</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows === null && !error && <tr><td colSpan="6" className="empty">Loading…</td></tr>}
          {rows && filtered.length === 0 && <tr><td colSpan="6" className="empty">No bookings found.</td></tr>}
          {filtered.map((b) => (
            <tr key={b.id}>
              <td>{fmt(b.service_date)}<div className="muted">{b.start_time}{b.duration_hours ? ` · ${b.duration_hours}h` : ''}</div></td>
              <td>{b.customer_name}<div className="muted">{b.customer_email}</div><div className="muted">{b.customer_phone}</div></td>
              <td>{b.service}<div className="muted">{b.address}</div><div className="muted">via {b.source}</div></td>
              <td>{money(b.price)}</td>
              <td><span className={'pill ' + b.status}>{b.status}</span></td>
              <td><div className="actions">
                <button className="btn alt sm" onClick={() => setModal({ type: 'edit', booking: b })}>Edit</button>
                {b.status !== 'cancelled' && b.status !== 'completed' && <button className="btn sage sm" onClick={async () => { await api('/api/admin/bookings', { method: 'PATCH', body: { id: b.id, status: 'completed' } }); load(); }}>Complete</button>}
                {b.status !== 'cancelled' && <button className="btn danger sm" onClick={() => setModal({ type: 'cancel', booking: b })}>Cancel</button>}
                <button className="btn alt sm" onClick={() => setModal({ type: 'delete', booking: b })}>Delete</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {modal && (modal.type === 'new' || modal.type === 'edit') && <BookingForm modal={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal && modal.type === 'cancel' && <CancelDialog b={modal.booking} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal && modal.type === 'delete' && <DeleteDialog b={modal.booking} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </Shell>
  );
}

function BookingForm({ modal, onClose, onSaved }) {
  const editing = modal.type === 'edit';
  const [f, setF] = useState(editing ? { ...modal.booking, duration_hours: modal.booking.duration_hours ?? '', price: modal.booking.price ?? '', start_time: modal.booking.start_time ?? '', notes: modal.booking.notes ?? '', address: modal.booking.address ?? '' } : blank);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e, override = false) {
    e && e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { ...f, duration_hours: f.duration_hours === '' ? null : Number(f.duration_hours), price: f.price === '' ? null : Number(f.price), override_block: override };
      if (editing) await api('/api/admin/bookings', { method: 'PATCH', body: { id: f.id, service: f.service, service_date: f.service_date, start_time: f.start_time, duration_hours: body.duration_hours, address: f.address, price: body.price, notes: f.notes, status: f.status } });
      else await api('/api/admin/bookings', { method: 'POST', body });
      onSaved();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }
  return (
    <Modal title={editing ? 'Edit booking' : 'New booking'} onClose={onClose}>
      <form onSubmit={save}>
        <label>Customer name</label><input required value={f.customer_name} onChange={set('customer_name')} disabled={editing} />
        {!editing && <div className="grid2">
          <div><label>Email</label><input type="email" value={f.customer_email} onChange={set('customer_email')} /></div>
          <div><label>Phone</label><input value={f.customer_phone} onChange={set('customer_phone')} placeholder="+1 312 555 0100" /></div>
        </div>}
        <div className="grid2">
          <div><label>Service</label><select value={f.service} onChange={set('service')}>{[...new Set([f.service, ...SERVICES])].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label>Date</label><input type="date" required value={f.service_date} onChange={set('service_date')} /></div>
          <div><label>Start time</label><input type="time" value={f.start_time} onChange={set('start_time')} /></div>
          <div><label>Duration (hours)</label><input type="number" step="0.5" min="0" value={f.duration_hours} onChange={set('duration_hours')} /></div>
        </div>
        <label>Address</label><input value={f.address} onChange={set('address')} />
        <div className="grid2">
          <div><label>Price ($)</label><input type="number" step="0.01" min="0" value={f.price} onChange={set('price')} /></div>
          {editing && <div><label>Status</label><select value={f.status} onChange={set('status')}>{['pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></div>}
        </div>
        <label>Notes</label><textarea rows="3" value={f.notes} onChange={set('notes')} />
        {!editing && <label style={{ textTransform: 'none', letterSpacing: 0, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.send_notification} onChange={set('send_notification')} /> Send confirmation email &amp; SMS to the client</label>}
        {err && <div className="err">{err}{err.includes('blocked') && !editing && <> <a href="#" onClick={(e) => { e.preventDefault(); save(null, true); }}>Book anyway</a></>}</div>}
        <div className="actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className="btn alt" onClick={onClose}>Close</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CancelDialog({ b, onClose, onDone }) {
  const [reason, setReason] = useState(''); const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    try { await api('/api/admin/bookings', { method: 'PATCH', body: { id: b.id, status: 'cancelled', cancel_reason: reason, notify } }); onDone(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="Cancel booking" onClose={onClose}>
      <p>{b.customer_name} — {b.service} on {fmt(b.service_date)}</p>
      <label>Reason (included in the message to the client)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Team unavailable that day" />
      <label style={{ textTransform: 'none', letterSpacing: 0, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify client by email &amp; SMS</label>
      {err && <div className="err">{err}</div>}
      <div className="actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn alt" onClick={onClose}>Keep booking</button>
        <button className="btn danger" disabled={busy} onClick={go}>{busy ? 'Cancelling…' : 'Cancel booking'}</button>
      </div>
    </Modal>
  );
}

function DeleteDialog({ b, onClose, onDone }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    try { await api('/api/admin/bookings?id=' + b.id, { method: 'DELETE' }); onDone(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="Delete booking" onClose={onClose}>
      <p>Permanently delete {b.customer_name}&apos;s booking on {fmt(b.service_date)}? This cannot be undone and the client is <strong>not</strong> notified. Use <em>Cancel</em> instead if the client should be told.</p>
      {err && <div className="err">{err}</div>}
      <div className="actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn alt" onClick={onClose}>Back</button>
        <button className="btn danger" disabled={busy} onClick={go}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
      </div>
    </Modal>
  );
}
