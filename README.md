# Wingside Employees Portal

An internal portal for Wingside employees to access the employee handbook, company policies, announcements, and documents.

Self-hosted internal portal with first-party auth and content management.

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Prisma ORM
- **Rich Text Editor**: TipTap
- **File Storage**: Local filesystem
- **Hosting**: Hostinger VPS with Docker

## Features

- ✅ Email-based authentication (restricted to @wingside.ng)
- ✅ User registration with email domain validation
- ✅ Protected routes (dashboard, handbook, policies, announcements, documents)
- ✅ Responsive navigation
- ✅ Role-based access control
- ✅ Self-contained content management (database-driven)
- ✅ Rich text editing for handbook, policies, and announcements
- ✅ File upload for documents (local storage)
- ✅ Categorized policies and documents
- ✅ Admin panel for content management
- ✅ Search with content-aware results and type filters
- ✅ Policy workflow states + read receipts
- ✅ Onboarding checklist automation
- ✅ Calendar/events with RSVP support
- ✅ Document version history

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (Postgres)
- A code editor (VS Code recommended)

### Installation

1. **Navigate to the project:**
   ```bash
   cd wingside-portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

    Edit `.env` and configure the following variables:
    ```env
    DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
    DIRECT_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
    NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="[SUPABASE-ANON-KEY]"
    SUPABASE_SERVICE_ROLE_KEY="[SUPABASE-SERVICE-ROLE-KEY]"
   
    CRON_SECRET="change_me"
    ADMIN_IP_ALLOWLIST=""
   ```

4. **Run Prisma migrations:**
   ```bash
   npx prisma migrate deploy
   ```

5. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

 6. **Start the development server:**
    ```bash
    npm run dev
    ```

  7. **Open your browser:**
    Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
wingside-portal/
├── app/
│   ├── api/
│   │   └── auth/
│   ├── dashboard/
│   ├── handbook/
│   ├── policies/
│   ├── announcements/
│   ├── documents/
│   ├── login/
│   ├── register/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   └── SessionProvider.tsx
├── lib/
│   ├── auth.ts
│   └── prisma.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── proxy.ts
```

## Database Schema

### Users Table
- `id`: Unique user identifier
- `email`: User email (must end with @wingside.ng)
- `password`: Hashed password
- `name`: User's full name
- `role`: User role (employee/admin)
- `emailVerified`: Email verification timestamp
- `createdAt`: Account creation date
- `lastLogin`: Last login timestamp

## Deployment to Hostinger VPS

### Using Docker Compose (Recommended)

1. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

## Content Management

All content management is built into the admin panel:
- `/admin/announcements`
- `/admin/handbook`
- `/admin/policies`
- `/admin/documents`

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

## Security Considerations

- ✅ Passwords are hashed with bcrypt
- ✅ Email domain validation
- ✅ Protected API routes
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (Next.js default)
- ⚠️ Set up HTTPS for production
- ⚠️ Configure rate limiting

## Future Enhancements

- [ ] Email verification for registration
- [ ] Password reset functionality
- [ ] Role-based admin panel
- [ ] File upload handling
- [ ] Advanced search with filters
- [ ] Email notifications for announcements

## License

Internal use only - Wingside Employees Portal
