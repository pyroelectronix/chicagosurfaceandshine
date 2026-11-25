'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt, money, todayStr } from '@/lib/api';

export default function Dashboard() {
  const [bookings, setBookings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/admin/bookings'), api('/api/admin/customers'), api('/api/admin/blocks')])
      .then(([b, c, k]) => { setBookings(b.bookings); setCustomers(c.customers); setBlocks(k.blocks); })
      .catch((e) => setError(e.message));
  }, []);

  const today = todayStr();
  const month = today.slice(0, 7);
  const active = (bookings || []).filter((b) => b.status !== 'cancelled');
  const upcoming = active.filter((b) => b.service_date >= today && b.status !== 'completed').sort((a, b) => a.service_date.localeCompare(b.service_date) || (a.start_time || '').localeCompare(b.start_time || ''));
  const revenue = active.filter((b) => b.service_date.startsWith(month)).reduce((s, b) => s + (Number(b.price) || 0), 0);

  return (
    <Shell title="Dashboard">
      {error && <div className="err">{error} — check your Supabase environment variables.</div>}
      <div className="cards">
        <div className="card"><div className="n">{upcoming.filter((b) => b.service_date === today).length}</div><div className="l">Jobs today</div></div>
        <div className="card"><div className="n">{upcoming.length}</div><div className="l">Upcoming bookings</div></div>
        <div className="card"><div className="n">{customers.length}</div><div className="l">Customers</div></div>
        <div className="card"><div className="n">{money(revenue) || '$0.00'}</div><div className="l">Booked this month</div></div>
      </div>
      <div className="two">
        <div>
          <h3 style={{ marginBottom: 10 }}>Next up</h3>
          <div className="tablewrap"><table>
            <thead><tr><th>Date</th><th>Customer</th><th>Service</th><th>Status</th></tr></thead>
            <tbody>
              {bookings === null && !error && <tr><td colSpan="4" className="empty">Loading…</td></tr>}
              {bookings && upcoming.length === 0 && <tr><td colSpan="4" className="empty">No upcoming bookings yet.</td></tr>}
              {upcoming.slice(0, 8).map((b) => (
                <tr key={b.id}><td>{fmt(b.service_date)}<div className="muted">{b.start_time}</div></td><td>{b.customer_name}</td><td>{b.service}</td><td><span className={'pill ' + b.status}>{b.status}</span></td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div>
          <h3 style={{ marginBottom: 10 }}>Blocked dates</h3>
          <div className="card">
            {blocks.filter((k) => k.end_date >= today).length === 0 && <div className="muted">Nothing blocked.</div>}
            {blocks.filter((k) => k.end_date >= today).slice(0, 6).map((k) => (
              <div key={k.id} style={{ marginBottom: 10 }}>
                <strong>{fmt(k.start_date)}{k.end_date !== k.start_date ? ' → ' + fmt(k.end_date) : ''}</strong>
                <div className="muted">{k.reason || 'Unavailable'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
