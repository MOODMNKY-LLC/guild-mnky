# Supabase Platform Kit Setup

## Overview

The Supabase Platform Kit provides a UI for managing your Supabase backend (database, storage, auth, etc.). It requires a Management API token to authenticate with Supabase's Management API.

## Configuration

### 1. Get Your Management API Token

1. Go to [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Click "Generate New Token"
3. Give it a name (e.g., "Platform Kit - Local Dev")
4. Copy the token (you won't be able to see it again)

### 2. Add Token to Environment Variables

Add the token to your `.env.local` file:

```env
SUPABASE_MANAGEMENT_API_TOKEN=your-token-here
```

### 3. Restart Development Server

After adding the token, restart your Next.js development server:

```bash
npm run dev
```

## Local Development Limitations

⚠️ **Important**: The Supabase Management API (`api.supabase.com`) **does not support local projects**. The Management API is designed exclusively for cloud Supabase projects.

### What Happens with Local Projects:
- The Platform Kit UI will load
- Database queries will return 404 errors with a helpful message
- Most Management API endpoints will not work for local projects
- The proxy route detects local projects and returns clear error messages

### Recommended Solutions for Local Development:

**Option 1: Use Supabase Studio (Recommended)**
- Access at `http://localhost:54323` (default Studio port)
- Provides full database management, SQL editor, table browser, and more
- No Management API token required
- This is the official way to manage local Supabase instances

**Option 2: Connect to a Cloud Project**
- Update `NEXT_PUBLIC_SUPABASE_URL` to your cloud project URL
- Update `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to your cloud project key
- Platform Kit will work fully with cloud projects
- Useful for testing Platform Kit features, but data will be in cloud, not local

### Error Messages

When accessing Platform Kit with a local project, you'll see:
- **404 errors** for database queries with message: "The Supabase Management API does not support local projects. For local development, please use Supabase Studio at http://localhost:54323..."
- This is expected behavior - the proxy route detects local projects and provides helpful guidance

## Error Messages

### "Supabase Management API token is not configured"

**Solution**: Add `SUPABASE_MANAGEMENT_API_TOKEN` to your `.env.local` file. See step 2 above.

### "Server configuration error" or 500 errors

**Possible Causes**:
1. Token is missing or invalid
2. Token doesn't have required permissions
3. Local project limitations (see above)

**Solutions**:
1. Verify token is correctly set in `.env.local`
2. Generate a new token from the dashboard
3. For local development, consider using Supabase Studio instead

## Production Setup

For production deployments (Vercel, etc.):

1. Add `SUPABASE_MANAGEMENT_API_TOKEN` to your deployment platform's environment variables
2. Use your cloud Supabase project URL and keys
3. Platform Kit will work fully with cloud projects

## References

- [Supabase Management API Documentation](https://supabase.com/docs/reference/api/v1-authorize-user)
- [Supabase Platform Kit Documentation](https://supabase.com/ui/docs/platform/platform-kit)
- [Access Tokens Guide](https://supabase.com/docs/guides/platform/oauth-apps/build-a-supabase-integration)
