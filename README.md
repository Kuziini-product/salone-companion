# Salone del Mobile — Field Companion

A mobile-first, offline-first app for capturing and organizing exhibitor data while walking the floor at Salone del Mobile.

```
┌─────────────────────────────────────────────────────────────┐
│  📱 Expo (React Native)                                     │
│  Camera · Offline DB (WatermelonDB) · Sync · AI calls       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│  ☁️  Supabase                                                │
│  Postgres + Storage + Auth + Edge Functions + Realtime      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  🤖 External: Anthropic Claude · OpenAI Whisper · Salone CSV│
└─────────────────────────────────────────────────────────────┘
```

---

## Repository layout

```
.
├── app/                    Expo React Native app (TypeScript)
│   ├── App.tsx             Root navigator
│   ├── src/
│   │   ├── db/             WatermelonDB schema + models + sync
│   │   ├── lib/            Supabase client + Zustand stores
│   │   ├── theme/          Apple-style design tokens
│   │   ├── components/     Reusable UI (Button, StatusPill)
│   │   ├── hooks/          Capture flow, RxJS observable hook
│   │   └── screens/        Auth · Capture · Companies · CompanyCard · Match · Contacts · Profile
│   └── package.json
│
├── supabase/
│   ├── migrations/         SQL — schema, RLS, sync RPC
│   ├── functions/          Edge Functions (Deno):
│   │   ├── match-logo/         Claude Vision → logo match
│   │   ├── parse-business-card/ Claude Vision OCR → fields
│   │   ├── summarize-visit/    Claude Haiku → visit recap
│   │   ├── transcribe-voice/   Whisper → transcript
│   │   └── export/             CSV/JSON download
│   ├── seed/seed.sql       Demo exhibitors + tags
│   └── config.toml         Local Supabase config (storage buckets)
│
├── importer/               Catalog ingestion (Node + Playwright)
│   ├── src/import-csv.ts   Bulk CSV → companies
│   ├── src/scrape.ts       Salone site scraper skeleton
│   └── data/exhibitors.sample.csv
│
└── package.json            npm workspaces root
```

---

## Quick start

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase account ([app.supabase.com](https://app.supabase.com))
- Anthropic API key — for vision matching, OCR, summaries
- (Optional) OpenAI API key — for Whisper voice transcription
- Expo Go app on your phone, or an Android/iOS simulator

### 1. Install dependencies

```bash
npm install
```

This installs the root + `app/` + `importer/` workspaces.

### 2. Set up Supabase

#### Option A — Cloud project (recommended)

1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. Note your **Project URL** and **anon key** (Settings → API).
3. Apply migrations via the Supabase SQL editor — paste each file from `supabase/migrations/` in order:
   - `20260425000001_initial_schema.sql`
   - `20260425000002_rls_policies.sql`
   - `20260425000003_sync_rpc.sql`
4. Optionally seed: paste `supabase/seed/seed.sql`.
5. Create three storage buckets (Storage → New bucket): `company-images`, `business-cards`, `voice-notes` — all **private**.

#### Option B — Local Supabase

```bash
npx supabase start
npx supabase db reset    # applies migrations + seed
```

### 3. Configure secrets

#### App (`app/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### Edge Functions (`supabase/.env.local`)

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Then push the secrets to Supabase:

```bash
npx supabase secrets set --env-file ./supabase/.env.local
npx supabase functions deploy match-logo parse-business-card summarize-visit transcribe-voice export
```

#### Importer (`importer/.env`)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # NEVER ship this to the app
CSV_PATH=./data/exhibitors.csv
```

### 4. Import the exhibitor catalog

```bash
# Sample data:
cp importer/data/exhibitors.sample.csv importer/data/exhibitors.csv
npm run importer:csv

# Or attempt the scraper (verify selectors against live DOM first):
npm run importer:scrape
```

### 5. Run the app

```bash
npm run app
```

Scan the QR code with Expo Go, or press `i` / `a` for simulator.

---

## Database schema

| Table         | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| `companies`   | Master catalog of exhibitors (read-only on the client)     |
| `tags`        | Free-form categories (Lighting, Sofas, Premium, …)         |
| `company_tags`| Many-to-many                                               |
| `visits`      | Per-user interaction with a company (status, notes, AI)    |
| `images`      | Stand photos, linked to a visit                            |
| `contacts`    | Business cards (with original card image stored)           |
| `voice_notes` | Voice memos + Whisper transcripts                          |
| `sync_log`    | Append-only operation log for conflict tracking            |

All user-owned tables enforce RLS — a user only sees their own visits, contacts, images, and voice notes.

The view `company_with_visit` joins catalog rows with the calling user's visit state for fast list rendering.

---

## API surface

Most CRUD goes via the Supabase auto-generated REST/GraphQL using the anon key + the user's JWT. Custom logic is in Edge Functions:

| Function              | Method | Body / params                          | Returns                                          |
| --------------------- | ------ | -------------------------------------- | ------------------------------------------------ |
| `match-logo`          | POST   | `{image_url, hall?, top_k?}`           | `{matches: [{company_id, name, confidence,…}]}`  |
| `parse-business-card` | POST   | `{image_url}`                          | `{full_name, role, email, phone, …, confidence}` |
| `summarize-visit`     | POST   | `{visit_id}`                           | `{summary}` (also persisted to `visits.ai_summary`) |
| `transcribe-voice`    | POST   | `{audio_url, voice_note_id?}`          | `{transcript}` (persisted if id provided)        |
| `export`              | GET    | `?format=csv\|json`                    | File download                                    |

### Sync RPC

`pull_changes(last_pulled_at)` returns WatermelonDB-shaped change diffs. The client pushes via standard upserts onto the user-owned tables (RLS enforces ownership).

---

## UI screens

| Screen           | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| **Auth**         | Email magic-link sign-in.                                                     |
| **Capture**      | Full-screen camera. Toggle Stand/Card. One-tap shutter.                       |
| **Match Result** | Top-3 vision matches with confidence; tap to confirm and open the card.      |
| **Companies**    | Searchable list, status filter chips, indexed by hall + name.                |
| **Company Card** | Header (status pill, mark visited/follow-up) · tabs: Info · Photos · Notes.  |
| **Notes tab**    | Markdown notes + voice notes + "Generate AI summary" (Claude Haiku).         |
| **Contacts**     | List of scanned business cards.                                              |
| **Contact Detail** | Original card image + editable parsed fields.                              |
| **Profile**      | Sync status, manual sync, CSV export, sign-out.                              |

Design language: SF Pro / Inter, dark mode by default, 16pt rounded corners, soft shadows, haptic feedback on capture, swipe gestures planned.

---

## Offline-first behavior

- All writes hit local SQLite (WatermelonDB) **immediately**.
- Each row carries a `pending_sync` flag.
- On reconnect (or manual "Sync now"), the sync engine:
  1. **Pulls** server changes via the `pull_changes` RPC, scoped to the user.
  2. **Pushes** local changes by upserting to the relevant tables.
- Catalog data (`companies`) is **read-only** on the client and pre-cached at first launch (~5 MB for full Salone catalog).
- Images and voice notes are uploaded lazily; thumbnails are generated locally so the gallery is instant even before upload completes.

---

## Tech stack reference

| Layer               | Library                                            |
| ------------------- | -------------------------------------------------- |
| App framework       | Expo SDK 53, React Native 0.76, New Architecture   |
| Local DB            | WatermelonDB (SQLite + JSI)                        |
| State               | Zustand + React Query                              |
| Navigation          | React Navigation (native stack + bottom tabs)      |
| Camera              | expo-camera                                        |
| Audio               | expo-av                                            |
| Image processing    | expo-image-manipulator (resize before upload)      |
| Backend             | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Vision + summaries  | Anthropic Claude (`claude-opus-4-7`, `claude-haiku-4-5`) |
| Voice transcription | OpenAI Whisper (`whisper-1`)                       |
| Scraper             | Playwright + Cheerio                               |

---

## Implementation roadmap

- [x] Schema + RLS + sync RPC
- [x] Edge Functions (match-logo, parse-card, summarize-visit, transcribe-voice, export)
- [x] Expo app scaffold (auth, theme, navigation)
- [x] WatermelonDB models + sync hook
- [x] Capture screen (camera, Stand/Card mode, ML upload)
- [x] Company list + company card + match result
- [x] Contacts list + detail
- [x] CSV importer + scraper skeleton
- [ ] Voice notes UI in Company Card (recording + transcript display)
- [ ] Auto-sync timer + connectivity detection (NetInfo)
- [ ] Tags UI (assign / filter)
- [ ] Image gallery viewer with swipe
- [ ] Pre-fair catalog pre-cache on first launch
- [ ] Production builds (EAS Build for App Store / Play Store)

---

## Real-world considerations

- **Battery** — Disable GPS, batch sync to every 5 min, dim screen between captures.
- **Lighting** — Stands have aggressive spotlights; train users to angle business cards away from glare.
- **Italian text** — UTF-8 + the `unaccent` extension handle the diacritics for fuzzy matching.
- **Brand ambiguity** — many furniture brands share words ("Studio", "Casa", "Design"). The matcher always returns top-3, never auto-confirms.
- **Network** — Rho fairgrounds Wi-Fi is unreliable. Offline-first is the only viable architecture.

---

## Security notes

- The **service-role key** is only used by the importer (server-side). It must never be embedded in the mobile app.
- The mobile app uses only the **anon key** + the user's session JWT. RLS enforces every per-user boundary.
- Storage paths follow `{user_id}/{folder}/{filename}` so RLS policies on `storage.objects` automatically prevent cross-user access.
- Magic-link auth — no passwords, no plaintext, replays expire in minutes.

---

## License

Private. Internal use for Salone del Mobile attendance.
