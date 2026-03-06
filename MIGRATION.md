# Self-Contained Database Version - Migration Summary

## What Changed

The portal has been converted from using Sanity CMS (external service) to a **100% self-contained database solution** using PostgreSQL.

## What Was Removed

- ❌ Sanity CMS dependency
- ❌ External API calls to Sanity
- ❌ Sanity-related configuration files
- ❌ Content stored on third-party servers

## What Was Added

### Database Tables

**Announcements**
- `id`, `title`, `content`, `pinned`, `publishedAt`
- Rich text content stored as HTML
- Pin important announcements to top

**Handbook Sections**
- `id`, `title`, `slug`, `content`, `order`
- Organized employee handbook
- Custom ordering for sections

**Policies**
- `id`, `title`, `slug`, `category`, `summary`, `content`
- Categorized policies (HR, IT, Operations, Finance, Legal, Workplace)
- Effective date and last reviewed tracking

**Documents**
- `id`, `title`, `description`, `category`, `filename`, `filepath`, `filesize`, `mimetype`
- File uploads stored locally in `public/uploads/`
- Organized by category (Forms, Templates, Guides, Policies, Benefits, Training)

### API Routes

All content management happens through REST API routes at `/api/admin/`:

- `GET/POST /api/admin/announcements` - List/create announcements
- `GET/PUT/DELETE /api/admin/announcements/[id]` - Manage individual announcements
- `GET/POST /api/admin/handbook` - List/create handbook sections
- `GET/PUT/DELETE /api/admin/handbook/[id]` - Manage sections
- `GET/POST /api/admin/policies` - List/create policies
- `GET/PUT/DELETE /api/admin/policies/[id]` - Manage policies
- `GET/POST /api/admin/documents` - List/upload documents
- `GET/DELETE /api/admin/documents/[id]` - Manage documents

**Note**: All write operations (POST, PUT, DELETE) require admin role.

### Rich Text Editor

- **TipTap** rich text editor component
- Features: Bold, Italic, Headings (H2, H3), Bullet/Numbered Lists, Links
- Content stored as HTML in database
- Easy for HR team to create formatted content

### File Upload System

- Files uploaded to `public/uploads/` directory
- Automatic timestamp-based filename generation
- File size and type tracking
- Direct download links from frontend

### Admin Panel

Located at `/admin` (requires admin role):

- **Dashboard**: Overview with quick access to all content types
- **Navigation**: Easy switching between content sections
- **Protected**: Only accessible to users with `role: 'admin'`

## URL Structure Changes

### Before (Sanity)
```
/announcements/{slug}       ← Sanity slug
/handbook/{slug}            ← Sanity slug
/policies/{slug}            ← Sanity slug
```

### After (Database)
```
/announcements/{id}         ← Database ID
/handbook/{slug}            ← Database slug
/policies/{id}              ← Database ID
```

**Note**: Handbook still uses slugs for human-friendly URLs.

## Benefits of This Approach

✅ **100% Self-Contained**
- No external dependencies
- All data in your PostgreSQL database
- No API calls to third-party services

✅ **Full Data Control**
- You own everything
- No service limits
- No subscription fees

✅ **Simpler Architecture**
- Database → Frontend (direct)
- No CMS middleware
- Faster page loads (no API latency)

✅ **Easy to Back Up**
- Single database backup
- Files in local directory
- No need to export from external service

✅ **Scalable**
- Handle as much content as you need
- No tier limits
- No API rate limits

## What You Need to Do

### 1. Set Up Your Database

Run the migration when Docker is available:

```bash
docker-compose up -d postgres
npx prisma migrate dev --name add_content_tables
npx prisma generate
```

### 2. Create an Admin User

You'll need to manually set a user as admin in the database:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your-admin@wingside.ng';
```

### 3. Create Content

1. Log in as admin
2. Go to `/admin`
3. Use the admin panel to create content
4. Content appears instantly on the portal

### 4. Upload Files

Files are stored in `public/uploads/`:
- Make sure this directory exists
- Has write permissions
- Is included in your backups

## Development Workflow

### For HR/Admin Team

1. Access `/admin` (requires admin account)
2. Click on content type (Announcements, Handbook, Policies, Documents)
3. Use rich text editor to create content
4. Save - appears immediately on portal

### For Developers

All data is in PostgreSQL:
- Query with Prisma
- No external API dependencies
- Simple CRUD operations

## Security Considerations

### Admin Routes Protected
- Middleware checks for admin role
- API routes verify session
- Non-admins redirected to dashboard

### File Uploads
- Files stored outside web root initially
- Moved to `public/uploads/` with timestamp prefix
- Filenames sanitized to prevent path traversal

### Database Security
- Prisma prevents SQL injection
- Input validation on all forms
- Role-based access control

## Future Enhancements

Possible additions to the admin panel:

- [ ] Bulk upload for documents
- [ ] Content scheduling (publish later)
- [ ] Revision history
- [ ] Image uploads (currently text only)
- [ ] Search functionality
- [ ] Export/import functionality
- [ ] User management (make users admin)

## Troubleshooting

### Migration Won't Run

If you get "Can't reach database server":
```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Check it's accessible
docker-compose ps
```

### File Uploads Failing

Make sure `public/uploads/` directory exists and is writable:
```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### Admin Panel Returns 401

You need to set your user role to 'admin':
```sql
-- In psql or Prisma Studio
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@wingside.ng';
```

### Rich Text Editor Not Working

Make sure TipTap is installed:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link
```

## Performance Considerations

**Database Size**:
- Text content: Minimal storage (HTML is compact)
- Documents: Stored as files, not in DB
- No bloat from external service metadata

**Query Performance**:
- Indexed on: IDs, slugs, dates
- Efficient ordering (pinned, date, category)
- No API call overhead

**Caching**:
- Next.js automatically caches server components
- Can add Redis later if needed
- Static pages where possible

## Migration from Sanity (If You Already Had Content)

If you started with Sanity and want to migrate:

1. Export from Sanity:
```bash
sanity dataset export
```

2. Transform the JSON export to match our database schema

3. Import into PostgreSQL using Prisma:
```typescript
await prisma.announcement.create({
  data: transformedData
})
```

Or contact me and I can help write a migration script!

## Summary

Your portal is now:
- ✅ Self-contained (no external CMS)
- ✅ Database-driven (PostgreSQL)
- ✅ File storage (local)
- ✅ Rich text editing (TipTap)
- ✅ Admin panel (protected)
- ✅ Ready to use!

Everything lives on your VPS, fully under your control. 🎉
