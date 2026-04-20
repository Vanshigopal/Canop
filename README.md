<div align="center">
  <img src="apps/web/public/logo.svg" alt="Canop" width="120" />
  <h1>Canop</h1>
  <p><em>Navigate Your Potential</em></p>
  <p>AI-powered institutional ERP for Indian coaching institutes</p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
  ![License](https://img.shields.io/badge/License-Proprietary-red)
</div>

---

## What is Canop?

Canop is a multi-tenant SaaS platform that gives coaching institutes, tuition centers, and training academies a complete digital backbone — attendance, grades, fees, communication, analytics, and AI-driven insights — all under their own brand.

Each institute gets their own subdomain (e.g., `neet-academy.canop.app`) with white-label branding, while Canop handles the infrastructure.

## Architecture

```
canop-platform/
├── apps/
│   ├── api/          # Express + TypeScript REST API
│   ├── web/          # React + Vite frontend (Nordic Glass UI)
│   ├── mobile/       # React Native 0.74 (Android)
│   └── desktop/      # Electron 32 (Windows/macOS/Linux)
├── packages/
│   ├── db/           # Prisma schema + migrations + seeds
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
├── services/
│   └── ml/           # Python ML service (dropout + performance prediction)
├── infra/
│   ├── docker/       # Production Docker configs
│   └── env/          # Environment templates
└── docs/             # Deployment, QA, compliance docs
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, React Router |
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 16 with Row-Level Security |
| ORM | Prisma (14 migrations, 52 tables) |
| Cache | Redis |
| ML | Python, scikit-learn (dropout prediction, performance forecasting) |
| Auth | JWT with role-based access (Admin, Teacher, Student, Parent) |
| Payments | Razorpay |
| Storage | Cloudflare R2 (production) / local (dev) |
| Mobile | React Native 0.74, Material Design 3 |
| Desktop | Electron 32, auto-updater |

## Key Features

- **Multi-tenant architecture** — subdomain routing, tenant isolation, RLS on every table
- **12-portal system** — Admin, Teacher, Student, Parent, Accountant, Librarian, Transport, Hostel, Lab, Exam, HR, Platform Super Admin
- **AI/ML engine** — dropout risk prediction, performance forecasting, smart scheduling
- **Content modules** — study materials, video lectures, assignments with grading
- **Financial management** — fee plans, Razorpay checkout, payment tracking, financial analytics
- **Communication** — announcements, notifications, WhatsApp/SMS integration (Gupshup)
- **Analytics dashboard** — customizable widgets, batch comparison with t-test, CSV/HTML export
- **Cryptographic QR attendance** — tamper-proof, time-bound
- **Platform admin** — tenant management, subscription plans, revenue tracking

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 16+
- Redis 7+
- Python 3.11+ (for ML service)

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/canop-platform.git
cd canop-platform

# Install dependencies
pnpm install

# Set up environment
cp infra/env/.env.production.template .env
# Edit .env with your database URL, JWT secret, etc.

# Run database migrations
pnpm --filter @canop/db db:migrate:dev

# Seed demo data
pnpm --filter @canop/db db:seed

# Generate Prisma client
pnpm --filter @canop/db db:generate

# Start development
pnpm dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## Project Status

- ✅ 21 build sessions completed
- ✅ Full QA pass (OWASP Top 10 security audit)
- ✅ 0 TypeScript errors across 8 packages
- ✅ 14 migrations, 52 tables with RLS
- ✅ 150+ API endpoints
- ✅ ~60+ frontend pages
- ✅ ML models trained and functional
- ✅ Production deployment configs ready

## Brand

| Element | Value |
|---------|-------|
| Name | Canop (from Canopus — the navigation star) |
| Logo | Astrolabe — the world's first astronomical computer |
| Colors | Obsidian `#0A0914`, Indigo `#4F46E5`, Pearl `#F2ECE2` |
| Wordmark | Fraunces italic, 400 weight |
| Tagline | Navigate Your Potential |

## License

This project is proprietary software. All rights reserved. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built by Vanshigopal Patel</sub>
</div>
