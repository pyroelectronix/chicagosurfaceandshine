'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/bookings', 'Bookings'],
  ['/customers', 'Customers'],
  ['/calendar', 'Calendar & Blocks'],
];

export default function Shell({ title, actions, children }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  return (
    <div className="shell">
      <aside className="side">
        <img src="/logo.png" alt="Chicago Surface and Shine.Co" />
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={'nav' + (path.startsWith(href) ? ' on' : '')}>{label}</Link>
        ))}
        <div className="spacer" />
        <button className="btn alt" onClick={logout}>Log out</button>
      </aside>
      <main className="main">
        <div className="head"><h1>{title}</h1><div className="actions">{actions}</div></div>
        {children}
      </main>
    </div>
  );
}
