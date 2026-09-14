-- Løpedagboken — databaseskjema
-- Kjøres i Supabase SQL Editor (én gang, i et tomt prosjekt).

create extension if not exists "pgcrypto";

-- Kobler en auth-bruker til et visningsnavn og en rolle, slik at vi kan
-- vise hvem som logget en økt.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('utøver', 'trener')),
  created_at timestamptz not null default now()
);

-- Delt, voksende øvelsesbibliotek.
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('styrke', 'løp', 'annet')),
  created_at timestamptz not null default now()
);

-- Treningsøkter.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  rpe smallint check (rpe between 1 and 10),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_date_idx on sessions (date desc);

-- Øvelser logget i en økt (rekkefølge + eventuelt notat).
create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  position integer not null default 0,
  note text
);

create index if not exists session_exercises_session_idx on session_exercises (session_id);

-- Styrkedata for en loggført øvelse (tyngste sett).
create table if not exists strength_entries (
  session_exercise_id uuid primary key references session_exercises(id) on delete cascade,
  weight_kg numeric not null,
  reps_scheme text not null
);

-- Løpsdata for en loggført øvelse.
create table if not exists run_entries (
  session_exercise_id uuid primary key references session_exercises(id) on delete cascade,
  distance_m numeric not null
);

-- Enkelttider per rep for en løpsøvelse.
create table if not exists run_times (
  id uuid primary key default gen_random_uuid(),
  run_entry_id uuid not null references run_entries(session_exercise_id) on delete cascade,
  seconds numeric not null,
  position integer not null default 0
);

create index if not exists run_times_entry_idx on run_times (run_entry_id);

-- Øktforslag: fritekstnotater treneren (eller utøveren) kan poste til
-- hverandre, som en enkel meldingsliste. Ikke knyttet til en faktisk økt.
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists suggestions_created_at_idx on suggestions (created_at desc);

-- updated_at holdes oppdatert automatisk på sessions.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sessions_set_updated_at on sessions;
create trigger sessions_set_updated_at
before update on sessions
for each row execute function set_updated_at();

-- Row Level Security: kun de to innloggede kontoene skal ha tilgang.
-- Begge kan se alt. Kun utøveren kan skrive til selve øktloggen (økter,
-- øvelser-i-økt, styrke- og løpsdata) — treneren har skrivetilgang kun
-- til øktforslag (og det delte øvelsesbiblioteket).
alter table profiles enable row level security;
alter table exercises enable row level security;
alter table sessions enable row level security;
alter table session_exercises enable row level security;
alter table strength_entries enable row level security;
alter table run_entries enable row level security;
alter table run_times enable row level security;
alter table suggestions enable row level security;

-- Sann hvis innlogget bruker er utøveren.
create or replace function is_utover()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'utøver'
  );
$$;

drop policy if exists "authenticated full access" on profiles;
create policy "authenticated full access" on profiles for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on exercises;
create policy "authenticated full access" on exercises for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on sessions;
drop policy if exists "sessions_select" on sessions;
drop policy if exists "sessions_write" on sessions;
create policy "sessions_select" on sessions for select to authenticated using (true);
create policy "sessions_write" on sessions for all to authenticated using (is_utover()) with check (is_utover());

drop policy if exists "authenticated full access" on session_exercises;
drop policy if exists "session_exercises_select" on session_exercises;
drop policy if exists "session_exercises_write" on session_exercises;
create policy "session_exercises_select" on session_exercises for select to authenticated using (true);
create policy "session_exercises_write" on session_exercises for all to authenticated using (is_utover()) with check (is_utover());

drop policy if exists "authenticated full access" on strength_entries;
drop policy if exists "strength_entries_select" on strength_entries;
drop policy if exists "strength_entries_write" on strength_entries;
create policy "strength_entries_select" on strength_entries for select to authenticated using (true);
create policy "strength_entries_write" on strength_entries for all to authenticated using (is_utover()) with check (is_utover());

drop policy if exists "authenticated full access" on run_entries;
drop policy if exists "run_entries_select" on run_entries;
drop policy if exists "run_entries_write" on run_entries;
create policy "run_entries_select" on run_entries for select to authenticated using (true);
create policy "run_entries_write" on run_entries for all to authenticated using (is_utover()) with check (is_utover());

drop policy if exists "authenticated full access" on run_times;
drop policy if exists "run_times_select" on run_times;
drop policy if exists "run_times_write" on run_times;
create policy "run_times_select" on run_times for select to authenticated using (true);
create policy "run_times_write" on run_times for all to authenticated using (is_utover()) with check (is_utover());

drop policy if exists "authenticated full access" on suggestions;
create policy "authenticated full access" on suggestions for all to authenticated using (true) with check (true);

-- Etter at du har opprettet de to brukerne under Authentication → Users,
-- kjør én insert per bruker her (bytt ut UUID og navn):
--
-- insert into profiles (id, display_name, role) values
--   ('<uuid-fra-auth-users>', 'Navn', 'utøver');
-- insert into profiles (id, display_name, role) values
--   ('<uuid-fra-auth-users>', 'Navn', 'trener');
