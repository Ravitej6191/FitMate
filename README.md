# FitMate

Gym and daily-habit tracker for Android. Next.js 16 (static export) wrapped in Capacitor 8, with Zustand state persisted to `localStorage`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` | Static export to `out/` |
| `npm run android` | Build, `cap sync`, open Android Studio |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Android setup

Google Sign-In needs your own Firebase project: put `google-services.json` in `android/app/` and set `WEB_CLIENT_ID` in `lib/auth.ts` (see the header comment there). Sign-in and the step counter only work on a device or emulator with Google Play Services.
