# Adventure App

Gamified adventure map app (Next.js static export + MapLibre, served on GitHub Pages).

## Features by branch (each branch stacks on the previous one)

| # | Branch | What it adds |
|---|--------|--------------|
| 1 | `feature/real-map` | Real MapLibre map with the neon atlas style and game HUD |
| 2 | `feature/photo-map` | Photos on the map (Apple-Photos-style clusters, EXIF GPS, viewer) |
| 3 | `feature/admin-auth` | Accounts with an **admin** role (mock local auth behind `AuthService`) |
| 4 | `feature/adventures` | Admin attaches an **adventure** to a picture: name, brief, unique marker, Join |
| 5 | `feature/adventure-steps` | Adventure **steps** on map locations with prerequisites and rewards |

### Feature 2 — Photo map (`feature/photo-map`)

- **Photos** (left dock) opens the library, grouped by day. **Add photos** accepts several photos/videos.
- JPEGs with GPS EXIF are placed automatically (and keep their capture time). Anything without GPS
  goes into a *drop a pin* queue: pan the map under the reticle (or *My location*) and confirm, or skip.
- Pins are clustered thumbnails with a count badge that regroup as you zoom. Tap a stack to see its
  photos (and *Zoom to these photos*); tap a single photo to open the viewer (swipe / arrows, edit
  caption & place, show on map, delete).
- iPad note: iOS only keeps photo location in uploads when the picker's *Options → Location* is on;
  otherwise you'll be asked to drop a pin.

### Feature 3 — Admin account (`feature/admin-auth`)

- First run on a device: dock → **Sign in** → **Admin setup** creates the admin (game master) account.
  No credentials are shipped in the code.
- Admins get an **Admin** dock item: users database (change roles, remove, create accounts) and a
  *reset demo content* tool. Signing in is required to add photos; admins can edit/delete any photo,
  others only their own.
- `src/lib/auth/service.ts` is the only auth API (local implementation: PBKDF2 password hashes in
  localStorage, session in sessionStorage + optional "keep me signed in"). Two tabs can be signed in
  as different users. Swap for Supabase Auth + a `profiles.role` column later.

### Feature 4 — Adventures on pictures (`feature/adventures`)

- Admin: open any photo → **Attach adventure** → name, codename, brief, objective, a unique map marker
  (6 shapes × 6 colours, live preview) and status (draft / open / active / done). Drafts are admin-only.
- Every adventure shows on the map as a raised banner above its picture. Tap it (or use the
  **Adventures** dock list) for the dossier with crew list and a **Join adventure** button
  (sign-in required). Admins can edit or delete from the dossier.
- Seed adventures: *Sands of Diriyah* (At-Turaif) and *Crimson Run* (Red Sands).

### Feature 5 — Adventure steps (`feature/adventure-steps`)

- Admin: dossier → **Design steps** opens the mission designer. Each step has a title, instruction,
  an optional map location (**Set on map** → reticle placement, check-in radius), prerequisites
  (other steps that must be completed first — loops are blocked) and rewards (items, XP, badges).
- The map draws the selected adventure's route: numbered step waypoints (solid = unlocked,
  dotted = locked, filled = done) joined by dashed prerequisite lines.
- Players who joined get a **Mission** dock item: progress bar, XP, inventory of earned rewards,
  and per-step **Check in** (GPS within the radius) or **Mark done (demo)** for testing remotely.

### Data layer (mock, swappable for Supabase)

- `src/lib/data/types.ts` – domain types mirroring the planned Supabase tables.
- `src/lib/data/repository.ts` – the only API the UI uses. Local implementation = localStorage
  (state) + IndexedDB (`media.ts`, photo/video blobs). Replace with a Supabase implementation later.
- `src/lib/data/seed.ts` – sample photos around Riyadh (artwork in `public/seed/`).
- Storage keys are namespaced by base path, so each GitHub Pages preview keeps its own data.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000/Adventure-App
npm run build      # static export to out/
```

Preview builds for a sub-folder: `PAGES_BASE_PATH=/Adventure-App/<slug> npm run build`.
