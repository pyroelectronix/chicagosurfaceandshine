// Public (read-only) endpoint for YOUR booking system's calendar.
// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns maintenance blocks plus booked dates so the booking calendar can grey them out.
import { db } from '@/lib/supabase';
import { json, isDate, CORS } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const from = p.get('from'), to = p.get('to');
  if (!isDate(from) || !isDate(to)) return json({ error: 'from and to (YYYY-MM-DD) are required' }, 400, CORS);
  const supabase = db();
  const [{ data: blocks }, { data: bookings }] = await Promise.all([
    supabase.from('blocked_dates').select('start_date,end_date,reason').lte('start_date', to).gte('end_date', from),
    supabase.from('bookings').select('service_date,start_time,duration_hours').gte('service_date', from).lte('service_date', to).neq('status', 'cancelled'),
  ]);
  return json({
    blocked: (blocks || []).map((b) => ({ start: b.start_date, end: b.end_date })), // reason intentionally not exposed
    booked: bookings || [],
  }, 200, { ...CORS, 'Cache-Control': 'no-store' });
}
