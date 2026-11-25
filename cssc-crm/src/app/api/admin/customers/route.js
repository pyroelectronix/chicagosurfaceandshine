import { db } from '@/lib/supabase';
import { json, clean } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db().from('customers').select('*').order('created_at', { ascending: false }).limit(2000);
  if (error) return json({ error: error.message }, 500);
  return json({ customers: data });
}

export async function POST(req) {
  const c = await req.json().catch(() => ({}));
  if (!clean(c.name)) return json({ error: 'Name is required' }, 400);
  const { data, error } = await db().from('customers').insert({
    name: clean(c.name), email: clean(c.email) || null, phone: clean(c.phone) || null,
    address: clean(c.address) || null, notes: clean(c.notes) || null,
  }).select('*').single();
  if (error) return json({ error: error.message.includes('duplicate') ? 'A customer with that email already exists.' : error.message }, 400);
  return json({ customer: data }, 201);
}

export async function PATCH(req) {
  const c = await req.json().catch(() => ({}));
  if (!c.id) return json({ error: 'id required' }, 400);
  const patch = {};
  for (const k of ['name', 'email', 'phone', 'address', 'notes']) if (k in c) patch[k] = clean(c[k]) || null;
  if ('name' in patch && !patch.name) return json({ error: 'Name is required' }, 400);
  const { data, error } = await db().from('customers').update(patch).eq('id', c.id).select('*').single();
  if (error) return json({ error: error.message }, 400);
  return json({ customer: data });
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);
  const { error } = await db().from('customers').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
