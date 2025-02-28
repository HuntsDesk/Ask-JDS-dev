# Changelog - Security and Thread Management Fixes

## Summary of Issues Addressed

### 1. Thread Creation Issue
- **Problem**: Excessive threads were being created automatically for users due to a problematic `useEffect` hook in `ChatLayout.tsx`.
- **Impact**: Users had up to 20+ threads created automatically without their knowledge.

### 2. Security Issues
- **Problem 1**: Row Level Security (RLS) was not enabled on the `profiles` table.
- **Problem 2**: Insecure RLS policy on `user_entitlements` referenced `user_metadata` which users can modify.
- **Problem 3**: Several functions had mutable search paths, creating potential security vulnerabilities.
- **Problem 4**: Insecure RLS policy on `models` table referenced `user_metadata` which users can modify.

## Changes Made

### Thread Management Fixes

1. **Fixed Automatic Thread Creation in `ChatLayout.tsx`**
   - Added a sessionStorage flag to track whether a default thread has been created
   - Prevents multiple thread creations when component remounts or dependencies change
   - Location: `src/components/chat/ChatLayout.tsx`

2. **Created Thread Cleanup Function**
   - Implemented a SQL function to clean up excessive threads
   - Retains only the 5 most recent threads per user
   - Logs cleanup actions to the `error_logs` table
   - Location: `supabase/migrations/20250225_cleanup_threads_v2.sql`

### Security Fixes

1. **Created Comprehensive Security Fix Script**
   - Fixed all security issues in a single robust script
   - Properly handles all variable declarations to avoid syntax errors
   - Includes idempotent operations that can be run multiple times safely
   - Location: `supabase/migrations/20250226_fix_all_security_issues.sql`
   - Fixes include:
     - Enabling RLS on the `profiles` table
     - Creating secure policies for the `profiles` table
     - Fixing insecure policies on `user_entitlements` and `models` tables
     - Fixing function search path issues for all functions

2. **Fixed Insecure RLS Policies**
   - Replaced policies that referenced `user_metadata` with secure policies
   - New policies use the `users` table to verify admin status
   - Fixed policies on:
     - `user_entitlements` table
     - `models` table

3. **Fixed Function Search Path Issues**
   - Added `SET search_path = public` to all functions
   - Used `SECURITY DEFINER` to ensure functions run with appropriate permissions
   - Implemented robust error handling:
     - Uses PL/pgSQL exception handling to catch and report errors
     - Checks for existing objects before creating them
     - Uses `CASCADE` option when dropping functions to handle dependencies
     - Properly declares variables in PL/pgSQL blocks to avoid syntax errors
     - Wraps each operation in its own transaction block
     - Provides detailed NOTICE messages for each operation
   - Affected functions:
     - `handle_new_user`
     - `handle_updated_at`
     - `ensure_single_active_prompt`
     - `has_entitlement`
     - `ensure_single_active_ai_setting`
     - `update_updated_at_column`

## How to Apply These Changes

1. Run the SQL migrations in the Supabase dashboard SQL editor:
   - First run `supabase/migrations/20250226_fix_all_security_issues.sql` (comprehensive fix)
   - Then run `supabase/migrations/20250225_cleanup_threads_v2.sql` (thread cleanup)

2. Deploy the updated `ChatLayout.tsx` file with your next application deployment.

## Monitoring and Next Steps

1. **Monitor Thread Creation**
   - Check if the fix prevents automatic thread creation
   - Run the following SQL query to monitor thread counts:
     ```sql
     SELECT user_id, COUNT(*) as thread_count 
     FROM threads 
     GROUP BY user_id 
     ORDER BY thread_count DESC;
     ```

2. **Verify Security Fixes**
   - Check the Supabase dashboard for resolved security alerts
   - Verify that RLS is enabled on all tables
   - Confirm that no policies reference `user_metadata` by running:
     ```sql
     SELECT schemaname, tablename, policyname, cmd, qual
     FROM pg_policies
     WHERE qual::text LIKE '%user_metadata%';
     ```

3. **Consider Additional Thread Management Features**
   - Implement a UI for users to manage their threads
   - Set up a scheduled job to periodically clean up old threads
   - Add a maximum thread limit per user in the application logic 