SB SALON BOOKING APP — SETUP NOTES

Files
- index.html: customer booking page and admin panel
- style.css: main styles
- responsive.css: mobile/tablet styles
- script.js: Supabase, booking, slot and admin logic

1. Open script.js and replace YOUR_PUBLISHABLE_KEY with your Supabase sb_publishable_... key.
   Do NOT use a secret or service_role key in browser code.
2. In Supabase, make sure your SQL schema, services, create_booking(p_...) and get_booked_slots(p_date) function are present.
3. In script.js, set CONFIG.whatsappNumber to the salon's WhatsApp number with country code and digits only, for example 919876543210. Do not include +, spaces or dashes.
4. Change CONFIG.slotTimes to the salon's actual opening times. These are currently demo slots.
5. In Supabase public.business_settings, set salon_name to SB Salon and configure real business details.
6. Test locally using VS Code Live Server or another local static server. The Supabase CDN needs an internet connection.
7. Test customer booking, duplicate slot handling, admin login, and status changes before using with real customers.

Important:
- Browser code uses a public publishable key. Database RLS and function permissions are essential.
- Customer data is sent to the database and, when WhatsApp is configured, included in a message opened for the customer to send.
- WhatsApp will not send automatically; the customer must press Send.
- This version uses one booking per time slot and fixed demo slot times. It does not yet calculate overlapping service durations or enforce weekly opening hours.
- Never expose a Supabase secret/service_role key.


PREMIUM ADMIN ANALYTICS UPDATE
------------------------------
The admin area now includes animated booking/revenue trend lines, booking-status donut, popular-service bars, monthly KPI cards, period filters, and a visitor count panel. The charts use lightweight Canvas drawing; no chart framework is required.

VISITOR TRACKING SETUP (OPTIONAL)
1. Open your Supabase project > SQL Editor.
2. Open visitor-analytics.sql from this folder, copy its full contents, and run it.
3. Redeploy/upload the updated website files to GitHub Pages.
4. Open the public website in a browser and visit it once; then sign in to the admin area and refresh.

The visitor metric records anonymous browser tab sessions, not verified unique humans. It does not collect names, phone numbers, or email addresses. If the SQL is not installed, the dashboard displays a setup note instead of inventing a number.

REVENUE DEFINITION
Revenue is calculated from appointments marked Completed and their final_total (falling back to subtotal). It is not proof of payment received. If you need cash/UPI/card payment tracking, add a separate payment status/amount field and record actual payments.

IMPORTANT LIMITS
- Analytics are calculated from the appointment records loaded by the current admin query (up to 200 recent records). For a busy salon, use database-side aggregate functions for complete historical reporting.
- Replace YOUR_PUBLISHABLE_KEY in script.js with your existing Supabase publishable key before publishing if it is still a placeholder. Never use a secret/service_role key in frontend code.
- Keep Supabase RLS enabled and test the admin account before going live.
