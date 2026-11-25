import { NextResponse } from 'next/server';

export const json = (data, status = 200, headers = {}) => NextResponse.json(data, { status, headers });
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z'));
export const clean = (v) => (typeof v === 'string' ? v.trim() : v);

export const CORS = {
  'Access-Control-Allow-Origin': process.env.BOOKING_SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Returns the blocked range overlapping a date, or null.
export async function findBlock(supabase, date) {
  const { data } = await supabase
    .from('blocked_dates').select('*')
    .lte('start_date', date).gte('end_date', date).limit(1);
  return data && data[0] ? data[0] : null;
}

// Find or create a customer by email (or phone). Returns customer id or null.
export async function upsertCustomer(supabase, { name, email, phone, address }) {
  let existing = null;
  if (email) {
    const { data } = await supabase.from('customers').select('*').ilike('email', email).limit(1);
    existing = data && data[0];
  }
  if (!existing && phone) {
    const { data } = await supabase.from('customers').select('*').eq('phone', phone).limit(1);
    existing = data && data[0];
  }
  if (existing) return existing.id;
  const { data, error } = await supabase.from('customers')
    .insert({ name, email: email || null, phone: phone || null, address: address || null })
    .select('id').single();
  if (error) throw error;
  return data.id;
}
