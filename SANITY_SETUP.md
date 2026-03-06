# Sanity CMS Setup Guide

This guide will help you set up Sanity CMS for the Wingside Employees Portal.

## Step 1: Create a Sanity Account

1. Go to [https://www.sanity.io](https://www.sanity.io)
2. Click "Get started" and create an account (or sign in with Google/GitHub)
3. Verify your email address if required

## Step 2: Create a New Sanity Project

1. After logging in, click "Create new project"
2. Enter project details:
   - **Project name**: "Wingside Employees Portal"
   - **Dataset name**: "production" (default)
3. Select "Start from scratch" or "Empty" template
4. Click "Create project"

## Step 3: Get Your Project Credentials

1. Once your project is created, you'll see your project dashboard
2. Note your **Project ID** (it's in the URL: `https://www.sanity.io/manage/project/<PROJECT_ID>`)
3. Go to **Settings → API → Tokens**
4. Click "Add API token"
   - **Label**: "Wingside Portal Read Token"
   - **Permissions**: "Viewer"
5. Copy the generated token

## Step 4: Configure Environment Variables

Add the following to your `.env` file:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id-here"
NEXT_PUBLIC_SANITY_DATASET="production"
SANITY_API_READ_TOKEN="your-read-token-here"
```

Replace with your actual credentials from Step 3.

## Step 5: Initialize Sanity Studio (Optional - Admin Access)

The Sanity Studio is already configured in this project. To access it:

### Option A: Run Studio Locally

1. Install Sanity CLI globally:
   ```bash
   npm install -g @sanity/cli
   ```

2. Authenticate:
   ```bash
   sanity login
   ```

3. Navigate to your project directory:
   ```bash
   cd wingside-portal
   ```

4. Link your project:
   ```bash
   sanity init
   ```
   - Select "Use existing project"
   - Choose your "Wingside Employees Portal" project

### Option B: Use Embedded Studio (Recommended)

The studio is already configured at `/studio` route. Once you've set up your environment variables, you can access it at:

```
http://localhost:3001/studio
```

## Step 6: Start Creating Content

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000/studio
3. You'll see the content types available:
   - **Announcement**: Company news and updates
   - **Handbook Section**: Employee handbook chapters
   - **Company Policy**: Company policies (categorized)
   - **Document**: Downloadable files and resources

## Content Type Examples

### 1. Create an Announcement

1. In the Studio, click "Announcement"
2. Click "New announcement"
3. Fill in:
   - **Title**: "Welcome to the Employee Portal!"
   - **Slug**: Auto-generated from title
   - **Body**: Add your content (rich text editor)
   - **Pin to top**: Toggle if important
   - **Published at**: Auto-filled with current date
4. Click "Publish"

### 2. Create a Handbook Section

1. Click "Handbook Section"
2. Click "New handbook section"
3. Fill in:
   - **Section Title**: "Introduction to Wingside"
   - **Slug**: Auto-generated
   - **Order**: 1 (determines display order)
   - **Content**: Add section content (rich text)
4. Click "Publish"

### 3. Create a Policy

1. Click "Company Policy"
2. Click "New company policy"
3. Fill in:
   - **Policy Title**: "Remote Work Policy"
   - **Slug**: Auto-generated
   - **Category**: Select category (HR, IT, Operations, etc.)
   - **Summary**: Brief description
   - **Policy Content**: Full policy details
   - **Effective Date**: When policy takes effect
   - **Last Reviewed**: Review date
4. Click "Publish"

### 4. Upload a Document

1. Click "Document"
2. Click "New document"
3. Fill in:
   - **Document Title**: "Leave Request Form"
   - **Description**: "Use this form to request time off"
   - **Category**: Select "Forms"
   - **File**: Click to upload PDF, Word doc, etc.
4. Click "Publish"

## Sanity Studio Features

### Rich Text Editor
- **Bold**, *italic*, and ~~strikethrough~~
- Headings (H2, H3, H4)
- Bullet and numbered lists
- Links to internal/external pages

### Image Handling
- Drag and drop images
- Automatic optimization
- Responsive delivery

### Collaboration
- Multiple users can edit simultaneously
- See who's viewing/editing content
- Version history and rollbacks

## Publishing Workflow

### Draft vs Published
- Content is saved as a **draft** by default
- Click **Publish** to make content live
- Published content is visible on the website
- Drafts are only visible in the Studio

### Editing Content
1. Find your content in the Studio
2. Make changes
3. Click **Publish** to update
4. Changes appear immediately on the website

## Testing Your Content

After creating content:

1. Dashboard: Check for announcements at http://localhost:3001/dashboard
2. Handbook: View handbook sections at http://localhost:3001/handbook
3. Policies: Browse policies at http://localhost:3001/policies
4. Documents: Access files at http://localhost:3001/documents

## Production Deployment

### Sanity CDN
Sanity automatically delivers content through a global CDN for fast loading.

### API Security
- Read-only token is safe for client-side use
- Write tokens are never exposed to the browser
- Content is delivered via Sanity's secure API

### Backup
- All content is automatically backed up by Sanity
- Export your dataset anytime:
  ```bash
  sanity dataset export
  ```

## Troubleshooting

### "Invalid project ID"
- Check your `.env` file
- Verify the project ID matches your Sanity dashboard
- Restart your dev server after changing `.env`

### Studio won't load
- Clear browser cache
- Check browser console for errors
- Ensure environment variables are set correctly

### Content not appearing on website
- Verify content is **Published** (not just draft)
- Check browser console for API errors
- Verify API token has correct permissions
- Try hard refresh (Ctrl+Shift+R)

### File upload fails
- Check file size limit (Sanity free tier: 10MB)
- Verify file format is supported
- Check internet connection

## Advanced Features (Optional)

### Webhooks
Set up webhooks to rebuild your site when content changes:
1. Go to Sanity dashboard → API → Webhooks
2. Add webhook URL for deployment triggers

### Custom Roles
Create custom user roles with specific permissions:
1. Go to Settings → Members
2. Invite team members with role-based access

### Content Editing Mode
Enable visual editing mode:
- Already configured in `sanity.config.ts`
- Works automatically with `stega.enabled` in preview mode

## Support Resources

- **Sanity Docs**: https://www.sanity.io/docs
- **Sanity Community**: https://www.sanity.io/community
- **Next.js + Sanity Guide**: https://nextjs.org/docs/app/building-your-application/configuring/nextjs-internals

## Content Management Best Practices

1. **Consistent Naming**: Use clear, descriptive titles
2. **Categories**: Always assign categories to policies and documents
3. **Order**: Use order field to control display sequence
4. **Dates**: Keep effective dates and review dates current
5. **Drafts**: Review thoroughly before publishing
6. **Images**: Optimize images before uploading (use WebP when possible)
7. **Links**: Test all links before publishing

## Next Steps

Once Sanity is set up:
- ✅ Create sample content for testing
- ✅ Train HR team on using Sanity Studio
- ✅ Set up content review workflow
- ✅ Plan content migration from existing resources
- ✅ Implement search functionality
- ✅ Add company branding

Your Sanity CMS is now ready to use! 🎉
