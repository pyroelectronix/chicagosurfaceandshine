import { db } from '@/lib/supabase';
import { json, isDate, clean } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db().from('blocked_dates').select('*').order('start_date');
  if (error) return json({ error: error.message }, 500);
  return json({ blocks: data });
}

// Block a date range (maintenance, holidays, days off). Also reports existing bookings that clash.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) {
    return json({ error: 'Valid start and end dates are required.' }, 400);
  }
  const supabase = db();
  const { data, error } = await supabase.from('blocked_dates')
    .insert({ start_date: b.start_date, end_date: b.end_date, reason: clean(b.reason) || null }).select('*').single();
  if (error) return json({ error: error.message }, 500);
  const { data: clashes } = await supabase.from('bookings').select('*')
    .gte('service_date', b.start_date).lte('service_date', b.end_date).neq('status', 'cancelled');
  return json({ block: data, clashes: clashes || [] }, 201);
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);
  const { error } = await db().from('blocked_dates').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
