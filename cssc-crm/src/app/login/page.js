'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push('/dashboard');
    else { setError(data.error || 'Login failed'); setBusy(false); }
  }
  return (
    <div className="login">
      <form className="box" onSubmit={submit}>
        <img src="/logo.png" alt="Chicago Surface and Shine.Co" />
        <h2>CRM Login</h2>
        <label style={{ textAlign: 'left' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        {error && <div className="err">{error}</div>}
        <button className="btn" style={{ width: '100%', marginTop: 14 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
