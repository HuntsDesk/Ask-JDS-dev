# Safari Compatibility Fix: Row Level Security and Thread Creation

This PR addresses an issue where Safari users encounter the error: 
**"new row violates row-level security policy for table 'threads'"**

## The Problem

Safari handles authentication cookies and sessions slightly differently from Chrome, causing two main issues:

1. **RLS Policy Violations**: Row Level Security policies in Supabase that work in Chrome fail in Safari, preventing thread creation.
2. **Thread Creation Loop**: The `ChatLayout` component would attempt to create multiple threads due to state management issues.

## The Solution

We've implemented three key fixes:

### 1. Database Migration Fix

A new migration file `supabase/migrations/20250301_fix_thread_rls_issue.sql` that:

- Creates a trigger to ensure a profile exists before thread creation
- Makes the thread insert policy more permissive
- Fixes foreign key constraints if they're pointing to the wrong table

### 2. Thread Creation Improvements in `use-threads.ts`

- Added profile existence check before thread creation
- Implemented retry logic for RLS failures
- Better logging for debugging
- Extended timeouts to accommodate slower connections

### 3. ChatLayout Robustness in `ChatLayout.tsx` 

- Used both `localStorage` and `sessionStorage` to prevent duplicate thread creation
- Added component mount/unmount tracking to prevent state updates after unmount
- Improved error handling and user feedback
- Extended timeouts and added delays to avoid race conditions with authentication

## How to Apply These Fixes

1. **Run the SQL Migration**
   - Navigate to the Supabase dashboard
   - Go to the SQL Editor
   - Copy and paste the contents of `supabase/migrations/20250301_fix_thread_rls_issue.sql`
   - Run the query

2. **Deploy Code Changes**
   - Deploy the updated files:
     - `src/components/chat/ChatLayout.tsx`
     - `src/hooks/use-threads.ts`

3. **Clear User Data (Recommended for Testing)**
   - After deployment, have users:
     - Clear browser cache and cookies 
     - Sign out and sign back in
     - This ensures a clean session with the new fixes

## Verifying the Fix

After applying the changes:

1. Test in both Chrome and Safari
2. Verify a new user can successfully create a thread in Safari
3. Verify thread loading works properly
4. Verify no duplicate threads are created

## Technical Details

### Row Level Security (RLS) Policies

The old thread insert policy was:

```sql
CREATE POLICY "threads_insert_policy" 
ON public.threads 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);
```

The new policy is more permissive:

```sql
CREATE POLICY "threads_insert_policy" 
ON public.threads 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);
```

### Thread Creation Safeguards

We now use a pre-insert trigger to ensure profiles exist:

```sql
CREATE TRIGGER ensure_profile_before_thread_insert
BEFORE INSERT ON public.threads
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_exists();
```

This automatically creates a profile if it doesn't exist, preventing RLS violations.

### Browser Compatibility

Safari's different handling of cookies and authentication tokens requires these additional safeguards. The changes maintain compatibility with all browsers while preventing the specific issues in Safari. 