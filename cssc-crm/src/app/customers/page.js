'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import Modal from '@/components/Modal';
import { api, fmt, money } from '@/lib/api';

export default function Customers() {
  const [rows, setRows] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = () => Promise.all([api('/api/admin/customers'), api('/api/admin/bookings')])
    .then(([c, b]) => { setRows(c.customers); setBookings(b.bookings); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const m = {};
    for (const b of bookings) {
      if (!b.customer_id) continue;
      const s = (m[b.customer_id] ||= { count: 0, spent: 0, last: '' });
      if (b.status !== 'cancelled') { s.count++; s.spent += Number(b.price) || 0; if (b.service_date > s.last) s.last = b.service_date; }
    }
    return m;
  }, [bookings]);

  const filtered = (rows || []).filter((c) => !q || [c.name, c.email, c.phone, c.address].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell title="Customers" actions={<button className="btn" onClick={() => setModal({})}>+ New customer</button>}>
      {error && <div className="err">{error}</div>}
      <div className="toolbar"><input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Customer</th><th>Contact</th><th>Bookings</th><th>Total booked</th><th>Last service</th><th></th></tr></thead>
        <tbody>
          {rows === null && !error && <tr><td colSpan="6" className="empty">Loading…</td></tr>}
          {rows && filtered.length === 0 && <tr><td colSpan="6" className="empty">No customers yet. They are added automatically when someone books.</td></tr>}
          {filtered.map((c) => {
            const s = stats[c.id] || { count: 0, spent: 0, last: '' };
            return (
              <tr key={c.id}>
                <td><strong>{c.name}</strong><div className="muted">{c.address}</div>{c.notes && <div className="muted">📝 {c.notes}</div>}</td>
                <td>{c.email}<div className="muted">{c.phone}</div></td>
                <td>{s.count}</td><td>{money(s.spent)}</td><td>{fmt(s.last)}</td>
                <td><div className="actions">
                  <button className="btn alt sm" onClick={() => setModal(c)}>Edit</button>
                  <button className="btn alt sm" onClick={async () => { if (confirm(`Delete ${c.name}? Their past bookings stay in the Bookings list.`)) { await api('/api/admin/customers?id=' + c.id, { method: 'DELETE' }); load(); } }}>Delete</button>
                </div></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      {modal && <CustomerForm c={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </Shell>
  );
}

function CustomerForm({ c, onClose, onSaved }) {
  const editing = !!c.id;
  const [f, setF] = useState({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/admin/customers', { method: editing ? 'PATCH' : 'POST', body: editing ? { id: c.id, ...f } : f }); onSaved(); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  }
  return (
    <Modal title={editing ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={save}>
        <label>Name</label><input required value={f.name} onChange={set('name')} />
        <div className="grid2">
          <div><label>Email</label><input type="email" value={f.email} onChange={set('email')} /></div>
          <div><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
        </div>
        <label>Address</label><input value={f.address} onChange={set('address')} />
        <label>Notes (access codes, pets, preferences)</label><textarea rows="3" value={f.notes} onChange={set('notes')} />
        {err && <div className="err">{err}</div>}
        <div className="actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className="btn alt" onClick={onClose}>Close</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
