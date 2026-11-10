# Løpedagboken

Treningsdagbok for en sprinter og treneren hennes. Bygget med Vite + vanilla
JavaScript/CSS og Supabase (autentisering + database).

## Funksjoner

- **Oversikt:** månedskalender og ukeplan. Utøveren kan legge inn planlagte
  økter (bare tittel) og loggføre dem når de er gjennomført.
- **Logg økt:** øvelser med vekt per sett eller tid per repetisjon, RPE,
  notat og valgfri skade/vondt-merknad.
- **Historikk:** gjennomførte økter gruppert per måned.
- **Progresjon:** personlige rekorder på 60 m og 150 m med graf per
  distanse, og tyngste sett per styrkeøvelse.
- **Skader** og **Forslag** (treneren kan lese alt og skrive forslag, men
  ikke endre økter).
- **Eksport:** «Eksporter data» på Historikk/Progresjon samler alle øktene
  i én tekst (Markdown eller JSON) som kan kopieres eller lastes ned og gis
  til en AI-assistent for å lage en rapport.

Skriftene (Big Shoulders Display og Space Grotesk) følger med i bygget via
`@fontsource`, så appen laster ingenting fra eksterne tjenester utenom
Supabase.

## Lokal utvikling

1. `npm install`
2. Kopier `.env.example` til `.env` og fyll inn Supabase-verdiene dine:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (Finnes under Project Settings → API i Supabase-prosjektet.)
3. `npm run dev`

## Supabase-oppsett (gjøres manuelt, ikke fra denne koden)

1. Opprett et nytt Supabase-prosjekt.
2. Åpne SQL Editor og kjør hele innholdet i `supabase/schema.sql`. Dette
   oppretter alle tabellene (øvelser, økter, øvelser-i-økt, styrke- og
   løpsdata) og sikkerhetsreglene (RLS) som gir de to innloggede
   kontoene full tilgang til alt, uavhengig av hvem som opprettet raden.
3. Opprett de to brukerkontoene (utøver og trener) manuelt under
   Authentication → Users.
4. Slå av "Allow new users to sign up" under Authentication → Providers →
   Email, slik at ingen andre kan registrere seg. Appen har ingen
   registreringsskjema, men denne innstillingen hindrer også direkte
   API-kall utenfra.
5. Kjør de to `insert into profiles …`-setningene nederst i
   `supabase/schema.sql` (kommentert ut), med de faktiske bruker-ID-ene
   fra steg 3 og de riktige navnene. Dette gjør at appen kan vise hvem
   som har logget en økt.

## Deploy (Netlify)

Netlify er koblet til GitHub-repoet og bygger automatisk ved push.

- Build command: `npm run build`
- Publish directory: `dist`
- Under Netlify → Site settings → Environment variables, legg inn de samme
  to variablene som i `.env`: `VITE_SUPABASE_URL` og
  `VITE_SUPABASE_ANON_KEY`. Uten disse vil ikke innlogging fungere i
  produksjon.
