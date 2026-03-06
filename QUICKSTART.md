# Quick Start Guide - Wingside Employees Portal

## Initial Setup (5 minutes)

### 1. Install Dependencies
```bash
cd wingside-portal
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and set a secure password:
```env
DB_PASSWORD="your_secure_password_here"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 3. Start Database
```bash
docker-compose up -d postgres
```

### 4. Initialize Database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Access the Application
- Open: http://localhost:3001
- You'll be redirected to the login page
- Click "Register here" to create your first account
- Use your @wingside.ng email address

## Common Commands

### Development
```bash
npm run dev          # Start development server
npx prisma studio    # View database in browser
```

### Database
```bash
npx prisma migrate dev    # Create/run migrations
npx prisma generate       # Generate Prisma client
./backup-db.sh           # Backup database
./restore-db.sh <file>   # Restore database
```

### Docker
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f postgres   # View database logs
```

## First User Registration

1. Go to http://localhost:3001/register
2. Fill in:
   - **Name**: Your full name
   - **Email**: yourname@wingside.ng
   - **Password**: (minimum 6 characters)
   - **Confirm Password**: (same as password)
3. Click "Create account"
4. You'll be redirected to login
5. Sign in with your credentials
6. Welcome to the dashboard!

## Troubleshooting

### "Database connection failed"
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### "Port already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### "Prisma client not generated"
```bash
npx prisma generate
```

## Next Steps

### For Development:
1. ✅ Authentication is working
2. ✅ Basic pages are created
3. 📝 Set up Sanity CMS for content management
4. 🎨 Add company branding
5. 🔍 Implement search functionality

### For Production:
1. Update `NEXTAUTH_URL` to your domain
2. Set up HTTPS with a reverse proxy (nginx)
3. Configure automated backups
4. Set up monitoring and logging
5. Review security settings

## File Locations

- **Configuration**: `next.config.ts`, `docker-compose.yml`, `.env`
- **Database Schema**: `prisma/schema.prisma`
- **Pages**: `app/` directory
- **Components**: `components/` directory
- **Authentication**: `lib/auth.ts`
- **Database Client**: `lib/prisma.ts`

## Getting Help

- Check the main README.md for detailed documentation
- Review docker-compose logs: `docker-compose logs -f`
- Check database status: `docker-compose ps`

## Useful Links

- Next.js Docs: https://nextjs.org/docs
- NextAuth.js: https://authjs.dev
- Prisma: https://www.prisma.io/docs
- Sanity CMS: https://www.sanity.io/docs
