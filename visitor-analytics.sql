-- SB Salon: privacy-conscious website visit counter
-- Run this in Supabase Dashboard > SQL Editor.
-- This records one anonymous row per browser tab session (not verified unique people).

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  source text not null default 'website' check (source = 'website'),
  visited_at timestamptz not null default now()
);

alter table public.site_visits enable row level security;

-- Public visitors may add a simple anonymous visit record; they cannot read visit data.
drop policy if exists "Public can record website visits" on public.site_visits;
create policy "Public can record website visits"
  on public.site_visits for insert to anon, authenticated
  with check (source = 'website');

-- Only the signed-in salon admin can read the count.
drop policy if exists "Admins can read website visits" on public.site_visits;
create policy "Admins can read website visits"
  on public.site_visits for select to authenticated
  using (public.is_admin());

grant insert on public.site_visits to anon, authenticated;
grant select on public.site_visits to authenticated;
