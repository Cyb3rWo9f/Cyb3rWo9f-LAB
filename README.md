<div align="center">

# 🐺 Cyb3rWo9f's Lab

**A cybersecurity portfolio & writeup platform with a terminal-inspired aesthetic**

[![Live Site](https://img.shields.io/badge/Live-cyb3rwo9f.me-10b981?style=for-the-badge&logo=vercel)](https://cyb3rwo9f.me)
[![Built with](https://img.shields.io/badge/Built%20with-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev)
[![Powered by](https://img.shields.io/badge/Powered%20by-Appwrite-F02E65?style=for-the-badge&logo=appwrite)](https://appwrite.io)

</div>

---

## ✨ Features

- **🔐 Protected Writeups** — Locked content stored in private Appwrite bucket, accessible only to approved users
- **📊 Platform Stats** — Real-time stats from TryHackMe, HackTheBox, and OffSec synced via GitHub Actions
- **🔑 Google OAuth** — Secure authentication with Appwrite, label-based access control
- **📰 Cybersecurity News** — Auto-synced RSS feeds from top security sources
- **💻 Terminal UI** — Dark theme with green accents and monospace typography
- **📝 Markdown Writeups** — Code highlighting, KaTeX math, and table of contents

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React, TypeScript, Vite |
| Backend | Appwrite (Auth, Database, Storage) |
| Styling | Tailwind CSS |
| Markdown | marked, highlight.js, KaTeX |
| Deployment | Vercel |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Cyb3rWo9f/Cyb3rWo9f-LAB.git
cd Cyb3rWo9f-LAB

# Install
npm install

# Configure (copy .env.example to .env and fill values)
cp .env.example .env

# Run
npm run dev
```

---

## 📁 Project Structure

```
├── components/       # React components
├── services/         # API services (Appwrite, GitHub, etc.)
├── context/          # Auth context
├── writeups/         # Local writeup files (gitignored)
├── scripts/          # CLI tools for syncing (gitignored)
├── tools/            # Go CLI for writeup management (gitignored)
└── public/           # Static assets
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│  DATABASE: writeups_meta (PUBLIC READ)                 │
│  → Metadata only: title, excerpt, tags, locked status  │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌──────────────────┐          ┌───────────────────────┐
│  PUBLIC BUCKET   │          │    PRIVATE BUCKET     │
│  (Anyone Read)   │          │  (Approved Users)     │
│                  │          │                       │
│  Free writeups   │          │  Locked writeups      │
└──────────────────┘          └───────────────────────┘
```

**Access Control:**
- Users need `approved` or `premium` label in Appwrite to access locked content
- Content is never exposed in network requests for unauthorized users

---

## 📜 License

This project is for personal portfolio use. Feel free to use it as inspiration for your own cybersecurity portfolio.

---

<div align="center">

**[cyb3rwo9f.me](https://cyb3rwo9f.me)**

</div>
