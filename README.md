# Løpedagboken

Treningsdagbok for en sprinter og treneren hennes. Bygget med Vite + vanilla
JavaScript/CSS og Supabase (autentisering + database).

## Lokal utvikling

1. `npm install`
2. Kopier `.env.example` til `.env` og fyll inn Supabase-verdiene dine:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (Finnes under Project Settings → API i Supabase-prosjektet.)
3. `npm run dev`

## Supabase-oppsett (gjøres manuelt, ikke fra denne koden)

- Opprett de to brukerkontoene (utøver og trener) manuelt under
  Authentication → Users i Supabase-dashbordet.
- Slå av "Allow new users to sign up" under Authentication → Providers →
  Email, slik at ingen andre kan registrere seg. Appen har ingen
  registreringsskjema, men denne innstillingen hindrer også direkte
  API-kall utenfra.

## Deploy (Netlify)

Netlify er koblet til GitHub-repoet og bygger automatisk ved push.

- Build command: `npm run build`
- Publish directory: `dist`
- Under Netlify → Site settings → Environment variables, legg inn de samme
  to variablene som i `.env`: `VITE_SUPABASE_URL` og
  `VITE_SUPABASE_ANON_KEY`. Uten disse vil ikke innlogging fungere i
  produksjon.
