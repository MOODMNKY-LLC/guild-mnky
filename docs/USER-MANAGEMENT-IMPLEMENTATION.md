# User Management System Implementation

This document describes the user management system implementation following Supabase best practices and documentation.

## Overview

A complete user management system has been implemented that allows users to:
- Automatically create profiles when they sign up
- View and edit their profile information (full name, username, website)
- Upload and manage profile avatars
- Access their account information

## Database Schema

### Profiles Table

Created in `supabase/migrations/20260123000000_create_profiles.sql`:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  website text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Features:**
- References `auth.users` with `on delete cascade` - when a user is deleted, their profile is automatically deleted
- Unique username constraint (optional, can be null)
- Automatic timestamp management via triggers

### Row Level Security (RLS)

RLS policies ensure users can only access their own profile:

- **SELECT**: Users can view their own profile
- **UPDATE**: Users can update their own profile  
- **INSERT**: Users can insert their own profile (fallback if trigger fails)

### Automatic Profile Creation

A trigger function `handle_new_user()` automatically creates a profile when a new user signs up:

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

The function extracts initial data from `raw_user_meta_data` if provided during signup.

## Components

### ProfileForm Component

**Location**: `components/profile-form.tsx`

A client component that allows users to:
- View their current profile information
- Edit full name, username, and website
- Save changes to the profiles table

**Features:**
- Loading states
- Error handling
- Form validation
- Automatic refresh after updates

### AvatarUpload Component

**Location**: `app/protected/settings/avatar-upload.tsx`

Updated to work with the profiles table instead of auth metadata:
- Uploads avatar images to Supabase Storage (`avatars` bucket)
- Updates the `avatar_url` field in the profiles table
- Provides visual feedback during upload

## Pages

### Account Page

**Location**: `app/account/page.tsx`

A dedicated account management page that includes:
- Profile form for editing user information
- Avatar upload component
- Account information display (email, user ID, profile creation date)

**Access**: 
- Available at `/account`
- Requires authentication (redirects to login if not authenticated)
- Linked from the user dropdown menu and protected layout navigation

### Settings Page

**Location**: `app/protected/settings/page.tsx`

Updated to include the ProfileForm component, providing profile management alongside other settings.

## Utilities

### Profile Helper Functions

**Location**: `lib/profiles.ts`

Utility functions for working with profiles:
- `getCurrentUserProfile()` - Get the current authenticated user's profile
- `getProfileById(userId)` - Get a profile by user ID

## Navigation Updates

- **Auth Button**: Updated "Profile" menu item to link to `/account`
- **Protected Layout**: Added "Account" link to navigation sidebar

## Migration Instructions

To apply the database changes:

1. **If using Supabase CLI locally:**
   ```bash
   supabase db reset
   # or
   supabase migration up
   ```

2. **If using Supabase Dashboard:**
   - Go to SQL Editor
   - Copy the contents of `supabase/migrations/20260123000000_create_profiles.sql`
   - Run the SQL script

3. **Verify the migration:**
   - Check that the `profiles` table exists
   - Verify RLS is enabled
   - Confirm the trigger function is created

## Usage Examples

### Getting Current User Profile (Server Component)

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return <div>Not authenticated</div>
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return <div>Hello {profile?.full_name || user.email}</div>
}
```

### Getting Current User Profile (Client Component)

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function MyComponent() {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(data)
    }
    loadProfile()
  }, [])
  
  return <div>{profile?.full_name}</div>
}
```

### Updating Profile

```typescript
const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    full_name: 'John Doe',
    username: 'johndoe',
    website: 'https://example.com',
    updated_at: new Date().toISOString(),
  })
```

## Security Considerations

1. **RLS Policies**: All access is protected by Row Level Security
2. **User Isolation**: Users can only access their own profile data
3. **Cascade Deletion**: When a user is deleted, their profile is automatically removed
4. **Unique Usernames**: Username uniqueness is enforced at the database level

## Storage Configuration

The avatar upload uses the `avatars` storage bucket. Ensure this bucket exists in your Supabase project:

1. Go to Storage in Supabase Dashboard
2. Create a bucket named `avatars` (if it doesn't exist)
3. Set it to public if you want avatars to be publicly accessible
4. Configure appropriate RLS policies for the bucket

## Next Steps

Potential enhancements:
- [ ] Add profile picture display in user dropdown
- [ ] Add username validation (e.g., alphanumeric only)
- [ ] Add profile completion percentage
- [ ] Add public profile pages (if needed)
- [ ] Add profile search functionality
- [ ] Add profile verification badges

## References

- [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data)
- [Next.js with Supabase Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
