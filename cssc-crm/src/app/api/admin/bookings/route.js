import { db } from '@/lib/supabase';
import { json, isDate, clean, findBlock, upsertCustomer } from '@/lib/http';
import { notifyBookingConfirmed, notifyBookingCancelled } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db().from('bookings').select('*').order('service_date', { ascending: false }).limit(1000);
  if (error) return json({ error: error.message }, 500);
  return json({ bookings: data });
}

// Create a booking manually from the CRM.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = clean(b.customer_name), service = clean(b.service);
  if (!name || !service || !isDate(b.service_date)) return json({ error: 'Name, service and a valid date are required.' }, 400);
  const supabase = db();
  const block = await findBlock(supabase, b.service_date);
  if (block && !b.override_block) return json({ error: `That date is blocked${block.reason ? ' (' + block.reason + ')' : ''}.` }, 409);
  const email = clean(b.customer_email) || null, phone = clean(b.customer_phone) || null;
  const customer_id = await upsertCustomer(supabase, { name, email, phone, address: clean(b.address) });
  const { data, error } = await supabase.from('bookings').insert({
    customer_id, customer_name: name, customer_email: email, customer_phone: phone,
    service, service_date: b.service_date, start_time: clean(b.start_time) || null,
    duration_hours: b.duration_hours || null, address: clean(b.address) || null,
    price: b.price || null, notes: clean(b.notes) || null, status: 'confirmed', source: 'manual',
  }).select('*').single();
  if (error) return json({ error: error.message }, 500);
  if (b.send_notification) await notifyBookingConfirmed(data);
  return json({ booking: data }, 201);
}

// Update fields or change status. Cancelling notifies the client.
export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return json({ error: 'id required' }, 400);
  const supabase = db();
  const { data: current } = await supabase.from('bookings').select('*').eq('id', b.id).single();
  if (!current) return json({ error: 'Not found' }, 404);

  const allowed = ['service', 'service_date', 'start_time', 'duration_hours', 'address', 'price', 'notes', 'status', 'cancel_reason'];
  const patch = {};
  for (const k of allowed) if (k in b) patch[k] = typeof b[k] === 'string' ? b[k].trim() : b[k];
  if ('service_date' in patch && !isDate(patch.service_date)) return json({ error: 'Invalid date' }, 400);
  if (patch.status && !['pending', 'confirmed', 'completed', 'cancelled'].includes(patch.status)) return json({ error: 'Invalid status' }, 400);

  const { data, error } = await supabase.from('bookings').update(patch).eq('id', b.id).select('*').single();
  if (error) return json({ error: error.message }, 500);
  if (patch.status === 'cancelled' && current.status !== 'cancelled' && b.notify !== false) {
    await notifyBookingCancelled(data, patch.cancel_reason);
  }
  return json({ booking: data });
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);
  const { error } = await db().from('bookings').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
