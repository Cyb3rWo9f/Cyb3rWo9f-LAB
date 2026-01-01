## Cyb3rWo9f's Lab

A Vite + React cybersecurity portfolio featuring protected writeups, platform stats dashboards, and a terminal-inspired UI.

### Features
- Protected writeups with approval gating (Appwrite labels `approved` or `premium`)
- Google OAuth login with Appwrite; guest sessions are disabled by default
- Markdown rendering with code highlighting and math (KaTeX)
- Platform stats sync (TryHackMe, HackTheBox, OffSec) via GitHub Actions
- Terminal/green accent theme with `>_` favicon

### Tech Stack
- React + Vite + TypeScript
- Appwrite (auth, data)
- Tailwind (via CDN), highlight.js, KaTeX, marked

### Prerequisites
- Node.js 18+ and npm
- Appwrite project set up with OAuth (Google) and the required collections/labels

### Local Setup
1) Clone and install
```
git clone <your-repo-url>
cd cyb3rwo9f's-lab
npm install
```
2) Configure environment
- Copy `.env.example` to `.env` (or `.env.local`)
- Set values (all prefixed with `VITE_`):
  - `VITE_APPWRITE_ENDPOINT` (e.g., https://nyc.cloud.appwrite.io/v1)
  - `VITE_APPWRITE_PROJECT_ID`
  - `VITE_APPWRITE_DATABASE_ID`, `VITE_APPWRITE_COLLECTION_ID` (writeups)
  - `VITE_APPWRITE_PLATFORM_COLLECTION_ID` (platform stats)
  - `VITE_WEB3FORMS_ACCESS_KEY` (contact form)
  - Any other vars you use from `.env.example`
3) Run dev server
```
npm run dev
```
4) Preview production build
```
npm run build
npm run preview
```

### Deployment (Vercel)
- Build command: `npm run build`
- Output dir: `dist`
- Install command: `npm install`
- Framework: Vite (set in `vercel.json`)
- Add the same `VITE_` env vars in Vercel project settings.

### Appwrite Notes
- Approval is **manual** via labels: only users with label `approved` or `premium` get full access. Email verification alone does not unlock content.
- CORS: allow your Vercel domain (and localhost for dev); enable credentials; allow headers such as `Content-Type`, `Origin`, `x-appwrite-project`.
- Guest sessions are off by default. If you later want a “Continue as Guest” flow, call `createAnonymousSession()` explicitly.

### Project Scripts
- `npm run dev` – start dev server
- `npm run build` – production build to `dist`
- `npm run preview` – preview the built app

### Favicon
- The tab icon uses the same `>_` mark as the header. File: `public/favicon.svg`.

### GitHub Push (manual)
```
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
