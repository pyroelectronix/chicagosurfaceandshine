// Called by YOUR booking system when a customer books.
// POST /api/bookings/inbound   header: x-api-key: <BOOKING_API_KEY>
import { db } from '@/lib/supabase';
import { json, isDate, clean, findBlock, upsertCustomer } from '@/lib/http';
import { notifyBookingConfirmed } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!process.env.BOOKING_API_KEY || req.headers.get('x-api-key') !== process.env.BOOKING_API_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const b = await req.json().catch(() => ({}));
  const name = clean(b.customer_name), service = clean(b.service);
  if (!name || !service || !isDate(b.service_date)) {
    return json({ error: 'customer_name, service and service_date (YYYY-MM-DD) are required.' }, 400);
  }
  const supabase = db();

  // Idempotency: the same external_id returns the existing booking.
  if (b.external_id) {
    const { data: dupe } = await supabase.from('bookings').select('*').eq('external_id', String(b.external_id)).limit(1);
    if (dupe && dupe[0]) return json({ booking: dupe[0], duplicate: true });
  }
  const block = await findBlock(supabase, b.service_date);
  if (block) return json({ error: 'Date unavailable', reason: block.reason || null }, 409);

  const email = clean(b.customer_email) || null, phone = clean(b.customer_phone) || null;
  const customer_id = await upsertCustomer(supabase, { name, email, phone, address: clean(b.address) });
  const { data, error } = await supabase.from('bookings').insert({
    customer_id, customer_name: name, customer_email: email, customer_phone: phone,
    service, service_date: b.service_date, start_time: clean(b.start_time) || null,
    duration_hours: b.duration_hours || null, address: clean(b.address) || null,
    price: b.price || null, notes: clean(b.notes) || null,
    status: 'confirmed', source: clean(b.source) || 'website',
    external_id: b.external_id ? String(b.external_id) : null,
  }).select('*').single();
  if (error) return json({ error: error.message }, 500);

  await notifyBookingConfirmed(data); // email + SMS to the client
  return json({ booking: data }, 201);
}
