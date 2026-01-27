# Fix Missing Sherpa Record

**Issue**: Approved application `095a79d9-ab82-4058-8129-813e4248c968` is missing its Sherpa record  
**Date**: 2026-01-23  
**Status**: ✅ Fixed (code updated, record needs to be created)

---

## Problem

When approving a Sherpa application, the code tried to create a Sherpa record but failed due to RLS policy violation. The application was approved, but the Sherpa record was not created.

**Root Cause**: 
- No INSERT policy existed for `sherpas` table allowing admins to create records
- Code was using regular client instead of admin client

---

## Fixes Applied

### 1. Added RLS Policy (`20260131000004_add_admin_sherpa_insert_policy.sql`)
- Created INSERT policy: "Admins and officers can create sherpa records"
- Allows admins/officers to insert Sherpa records

### 2. Updated Code (`app/(site)/sherpa/actions.ts`)
- Now uses admin client (service role key) to bypass RLS
- Better error handling
- Future approvals will work correctly

### 3. Created API Route (`app/api/admin/create-sherpa-record/route.ts`)
- Admin-only endpoint to create missing Sherpa records
- Can be called from admin panel or directly

---

## Create Missing Record

### Option 1: Use API Route (Recommended)

**From Browser Console** (on `/protected/admin` page):
```javascript
fetch('/api/admin/create-sherpa-record', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ applicationId: '095a79d9-ab82-4058-8129-813e4248c968' })
})
.then(r => r.json())
.then(console.log)
```

### Option 2: Use SQL Directly

Run in Supabase SQL Editor:
```sql
-- Create missing Sherpa record
INSERT INTO public.sherpas (
  profile_id,
  community_id,
  application_id,
  specialties,
  availability,
  is_active
)
SELECT 
  profile_id,
  community_id,
  id as application_id,
  specialties,
  availability,
  true as is_active
FROM public.sherpa_applications
WHERE id = '095a79d9-ab82-4058-8129-813e4248c968'
  AND status = 'approved'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.sherpas 
    WHERE sherpas.profile_id = sherpa_applications.profile_id
      AND sherpas.community_id = sherpa_applications.community_id
  )
RETURNING id;
```

### Option 3: Use Script (if dotenv is installed)

```bash
npx tsx scripts/create-missing-sherpa-record.ts 095a79d9-ab82-4058-8129-813e4248c968
```

---

## Verify Record Created

Run this query to confirm:
```sql
SELECT 
  sa.id as application_id,
  sa.status,
  s.id as sherpa_id,
  s.is_active,
  p.username
FROM sherpa_applications sa
LEFT JOIN sherpas s ON s.profile_id = sa.profile_id
LEFT JOIN profiles p ON p.id = sa.profile_id
WHERE sa.id = '095a79d9-ab82-4058-8129-813e4248c968';
```

You should see a `sherpa_id` value (not null).

---

## Prevention

- ✅ Code updated to use admin client
- ✅ RLS policy added for future approvals
- ✅ Better error handling in place

Future approvals will automatically create Sherpa records without errors.

---

**Next Step**: Create the missing record using one of the options above.
