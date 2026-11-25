# Chicago Surface and Shine.Co — CRM

Bookings, customers, and a calendar with maintenance blocks. Next.js + Supabase, deployed on Vercel.

## 1. Database (Supabase, free tier is fine)
1. Create a project at supabase.com.
2. SQL Editor → New query → paste `supabase/schema.sql` → Run.
3. Project Settings → API: copy the **Project URL** and the **service_role** key (keep it secret).

## 2. Push to GitHub
```bash
git init && git add . && git commit -m "CRM"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

## 3. Deploy on Vercel
1. vercel.com → Add New → Project → import the GitHub repo (framework: Next.js, no settings to change).
2. Add the environment variables from `.env.example` (at minimum: `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOKING_API_KEY`).
3. Deploy, then log in at `https://YOUR-APP.vercel.app` with `ADMIN_PASSWORD`.

Local run: `cp .env.example .env.local`, fill it in, `npm install && npm run dev`.

## 4. Connect your booking system

### a) When a customer books → send it to the CRM
```
POST https://YOUR-APP.vercel.app/api/bookings/inbound
x-api-key: <BOOKING_API_KEY>
Content-Type: application/json

{
  "customer_name": "Jane Doe",          // required
  "customer_email": "jane@example.com",
  "customer_phone": "+13125550100",     // include country code for SMS
  "service": "Deep Cleaning",           // required
  "service_date": "2026-12-10",         // required, YYYY-MM-DD
  "start_time": "09:00",
  "duration_hours": 3,
  "address": "123 W Madison St, Chicago",
  "price": 220,
  "notes": "Gate code 1234",
  "external_id": "booking-1042"         // optional; prevents duplicates if you retry
}
```
Responses: `201` created, `409` date is blocked, `401` bad key, `400` missing fields.
On success the CRM creates/updates the customer, saves the booking, and emails + texts the client.
Call this from your booking system's **server** — never put `BOOKING_API_KEY` in browser code.

### b) Keep your booking calendar in sync with maintenance blocks
```
GET https://YOUR-APP.vercel.app/api/availability?from=2026-12-01&to=2026-12-31
→ { "blocked": [{"start":"2026-12-24","end":"2026-12-26"}], "booked": [{"service_date":"...","start_time":"..."}] }
```
Grey out `blocked` days in your booking calendar. Set `BOOKING_SITE_ORIGIN` to lock CORS to your website.

## 5. Day to day
- **Cancel** a booking: marks it cancelled and (optionally) emails + texts the client with your reason.
- **Delete** a booking: removes the record permanently, no message sent.
- **Calendar & Blocks → Block dates**: closes a date range for maintenance. If bookings already exist in that range you are warned so you can cancel/reschedule them.

## Notifications
- Email: create a Resend account, verify your domain, set `RESEND_API_KEY` and `EMAIL_FROM`.
- SMS: Twilio account + number, set the three `TWILIO_*` vars. Note: US business texting requires Twilio A2P 10DLC registration before messages deliver reliably.
- Without these keys the CRM works normally; notifications are simply skipped.

## Security notes
- Single admin login (password + signed 12-hour cookie). Use a strong `ADMIN_PASSWORD`.
- The database is only reachable from the server (RLS on, service key never sent to the browser).
