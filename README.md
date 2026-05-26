# Wingside Employees Portal

Internal portal for Wingside staff to access announcements, handbook, policies, documents, onboarding, leave/requests, calendar events, and recognition.

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS
- Internal session auth (PostgreSQL-backed)
- PostgreSQL + Prisma ORM
- TipTap rich text editor
- Local filesystem uploads (`/uploads`)

## Current Features

- Staff registration with domain restriction (`@wingside.ng`)
- Admin approval workflow before account activation
- Role-based admin panel navigation and access
- Login and protected routes
- Password reset flow (forgot/reset)
- Employee profile management (including birthday and completion prompt)
- Handbook, policies, announcements, and document management
- Document versioning and safer upload validation
- Leave/HR requests workflow
- Events + RSVP
- Notifications and directory
- Health endpoint (`/api/health`) for uptime checks
- CI workflow (lint + build on push/PR)

## Prerequisites

- Node.js 20+
- PostgreSQL 16+

## Environment Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill `.env` values:

```env
DATABASE_URL="postgresql://wingside_user:YOUR_DB_PASSWORD@127.0.0.1:5432/wingside_portal?sslmode=disable"
DIRECT_DATABASE_URL="postgresql://wingside_user:YOUR_DB_PASSWORD@127.0.0.1:5432/wingside_portal?sslmode=disable"
ADMIN_IP_ALLOWLIST=""
```

## Run Locally

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open: `http://localhost:3001`

## Admin Approval Flow

1. Staff signs up via `/register`
2. Account is created with `status = pending_approval`
3. Admin reviews at `/admin/employees`
4. Admin approves -> `status = active` (user can log in)

## Password Reset Flow

1. User clicks `Forgot password?` on `/login`
2. Submit email on `/forgot-password`
3. User receives reset link and lands on `/reset-password`
4. User sets new password

## Important Routes

- Staff:
  - `/dashboard`
  - `/profile`
  - `/handbook`
  - `/policies`
  - `/documents`
  - `/leave`
  - `/calendar`
- Admin:
  - `/admin`
  - `/admin/employees` (approvals)
  - `/admin/announcements`
  - `/admin/handbook`
  - `/admin/policies`
  - `/admin/documents`
  - `/admin/onboarding`
  - `/admin/events`
  - `/admin/leave-requests`
- Ops:
  - `/api/health`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Security Notes

- Do not commit `.env`
- Rotate DB and email credentials if exposed
- Admin API routes enforce admin authorization checks

## License

Internal use only - Wingside Employees Portal
