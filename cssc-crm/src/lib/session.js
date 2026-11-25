// Signed-cookie session using Web Crypto (works in middleware + route handlers).
export const COOKIE = 'cssc_session';
const enc = new TextEncoder();

async function hmac(value) {
  const secret = process.env.SESSION_SECRET || '';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(token) {
  if (!token || !process.env.SESSION_SECRET) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
