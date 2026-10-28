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
