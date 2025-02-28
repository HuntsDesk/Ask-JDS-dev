# Security Best Practices for Supabase Development

## Database Security

### Row Level Security (RLS)

1. **Enable RLS on All Tables with User Data**
   - Always enable RLS on tables that contain user-specific data
   - Use `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
   - Example:
     ```sql
     ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
     ```

2. **Create Appropriate RLS Policies**
   - Define policies for each operation (SELECT, INSERT, UPDATE, DELETE)
   - Use `auth.uid()` to reference the current authenticated user
   - Example:
     ```sql
     CREATE POLICY "Users can read their own profile"
     ON profiles FOR SELECT
     USING (auth.uid() = user_id);
     ```

3. **Never Reference user_metadata in Policies**
   - ❌ AVOID: `auth.jwt() -> 'user_metadata' ->> 'is_admin' = 'true'`
   - ✅ USE: A dedicated admin check in a secure table
     ```sql
     CREATE POLICY "Admins can read all profiles"
     ON profiles FOR SELECT
     USING (EXISTS (
       SELECT 1 FROM users
       WHERE users.id = auth.uid()
       AND users.is_admin = true
     ));
     ```

4. **Test Policies Thoroughly**
   - Test each policy with different user roles
   - Verify that users can only access their own data
   - Verify that admins can access appropriate data

### Functions and Triggers

1. **Always Use SECURITY DEFINER and SET search_path**
   - All functions should include:
     ```sql
     SECURITY DEFINER
     SET search_path = public
     ```
   - Example:
     ```sql
     CREATE OR REPLACE FUNCTION handle_new_user()
     RETURNS TRIGGER
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $$
     BEGIN
       -- Function body
     END;
     $$;
     ```

2. **Properly Declare Variables in PL/pgSQL Blocks**
   - Always declare variables before the BEGIN statement
   - Example:
     ```sql
     DO $$
     DECLARE
       var_name text;
       counter integer := 0;
     BEGIN
       -- Code here
     END;
     $$;
     ```

3. **Use Exception Handling**
   - Implement proper error handling in functions
   - Log errors appropriately
   - Example:
     ```sql
     BEGIN
       -- Code here
     EXCEPTION
       WHEN others THEN
         RAISE NOTICE 'Error: %', SQLERRM;
         -- Handle error
     END;
     ```

4. **Make Functions Idempotent**
   - Functions should be safe to run multiple times
   - Check if objects exist before creating or dropping them
   - Example:
     ```sql
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_name') THEN
       -- Create trigger
     END IF;
     ```

### Authentication and Authorization

1. **Implement Proper Role-Based Access Control**
   - Create a dedicated `users` table with role information
   - Store admin status in a secure table, not in JWT claims
   - Example:
     ```sql
     CREATE TABLE users (
       id UUID PRIMARY KEY REFERENCES auth.users(id),
       email TEXT NOT NULL,
       is_admin BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
     );
     ```

2. **Use Feature Flags or Entitlements**
   - Implement a feature entitlement system
   - Store entitlements in a dedicated table
   - Example:
     ```sql
     CREATE TABLE user_entitlements (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES users(id),
       entitlement TEXT NOT NULL,
       is_active BOOLEAN DEFAULT TRUE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
     );
     ```

3. **Create Helper Functions for Permission Checks**
   - Implement reusable functions for common permission checks
   - Example:
     ```sql
     CREATE OR REPLACE FUNCTION is_admin()
     RETURNS BOOLEAN
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $$
     BEGIN
       RETURN EXISTS (
         SELECT 1 FROM users
         WHERE id = auth.uid()
         AND is_admin = true
       );
     END;
     $$;
     ```

## Application Security

### Frontend Security

1. **Never Store Sensitive Data in Client-Side Storage**
   - Avoid storing sensitive information in localStorage or sessionStorage
   - Use secure HTTP-only cookies for authentication tokens

2. **Implement Proper State Management**
   - Use flags to prevent duplicate operations
   - Example:
     ```javascript
     // Check if we've already created a thread
     const hasCreatedThread = sessionStorage.getItem('defaultThreadCreated');
     if (!hasCreatedThread) {
       // Create thread
       sessionStorage.setItem('defaultThreadCreated', 'true');
     }
     ```

3. **Validate All User Input**
   - Implement client-side validation
   - Never trust client-side validation alone; always validate on the server

4. **Use Singleton Pattern for Supabase Client**
   - Create a single instance of the Supabase client to avoid warnings and potential issues
   - Example:
     ```typescript
     // supabase.ts
     import { createClient } from '@supabase/supabase-js';

     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

     // Check if we already have a client in the global scope
     const globalWithSupabase = global as typeof globalThis & {
       supabase: ReturnType<typeof createClient> | undefined;
     };

     // Create the client only once
     if (!globalWithSupabase.supabase) {
       globalWithSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey, {
         auth: {
           persistSession: true,
           autoRefreshToken: true,
         },
       });
       console.log('Creating new Supabase client instance');
     } else {
       console.log('Using existing Supabase client from global scope');
     }

     export const supabase = globalWithSupabase.supabase;
     ```

### API Security

1. **Use Parameterized Queries**
   - Never concatenate user input directly into SQL queries
   - Use parameterized queries or ORM methods
   - Example:
     ```javascript
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('user_id', userId);
     ```

2. **Implement Rate Limiting**
   - Protect APIs from abuse with rate limiting
   - Consider using Supabase Edge Functions with rate limiting middleware

3. **Log Security Events**
   - Create a dedicated table for security-related logs
   - Log important security events like policy changes, role changes, etc.
   - Example:
     ```sql
     CREATE TABLE security_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       event_type TEXT NOT NULL,
       description TEXT NOT NULL,
       user_id UUID REFERENCES auth.users(id),
       ip_address TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
     );
     ```

## Development Workflow

### Code Review

1. **Security-Focused Code Reviews**
   - Have dedicated security reviews for database changes
   - Use a checklist for common security issues
   - Review all RLS policies and function definitions

2. **Database Migration Best Practices**
   - Make migrations idempotent (safe to run multiple times)
   - Test migrations in development before applying to production
   - Include rollback procedures for each migration

3. **Use Version Control for Database Changes**
   - Keep all SQL migrations in version control
   - Document the purpose of each migration
   - Include comments explaining security considerations

### Testing

1. **Implement Security Testing**
   - Test RLS policies with different user roles
   - Verify that users can only access their own data
   - Test edge cases and potential security bypasses

2. **Regular Security Audits**
   - Periodically review all RLS policies
   - Check for functions without proper security settings
   - Use Supabase's built-in security tools and linters

3. **Automated Testing**
   - Create automated tests for security-critical functionality
   - Include tests that verify RLS policies are working correctly

## Monitoring and Maintenance

1. **Regular Security Checks**
   - Run the following query periodically to check for insecure policies:
     ```sql
     SELECT schemaname, tablename, policyname, cmd, qual
     FROM pg_policies
     WHERE qual::text LIKE '%user_metadata%';
     ```

2. **Check for Functions Without Proper Security**
   - Run the following query to find functions without proper security settings:
     ```sql
     SELECT 
       n.nspname AS schema_name,
       p.proname AS function_name,
       p.prosecdef AS is_security_definer,
       pg_get_functiondef(p.oid) AS function_definition
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public'
     AND (
       p.prosecdef = false OR
       pg_get_functiondef(p.oid) NOT LIKE '%SET search_path = public%'
     );
     ```

3. **Monitor Database Performance**
   - Implement cleanup routines for tables that grow rapidly
   - Set reasonable limits on user-generated content
   - Example thread cleanup:
     ```sql
     DO $$
     DECLARE
       user_record RECORD;
       thread_count INTEGER;
     BEGIN
       FOR user_record IN SELECT DISTINCT user_id FROM threads LOOP
         SELECT COUNT(*) INTO thread_count FROM threads WHERE user_id = user_record.user_id;
         IF thread_count > 5 THEN
           DELETE FROM threads
           WHERE id IN (
             SELECT id FROM threads
             WHERE user_id = user_record.user_id
             ORDER BY created_at ASC
             LIMIT (thread_count - 5)
           );
         END IF;
       END LOOP;
     END;
     $$;
     ```

## Security Incident Response

1. **Create an Incident Response Plan**
   - Document steps to take in case of a security breach
   - Assign responsibilities for incident response
   - Include communication templates for users

2. **Backup and Recovery**
   - Implement regular database backups
   - Test restoration procedures
   - Document recovery steps for different scenarios

3. **Post-Incident Analysis**
   - Conduct thorough analysis after security incidents
   - Update security practices based on lessons learned
   - Document incidents and resolutions for future reference

## React Component Best Practices

1. **Avoid Deprecated APIs**
   - Replace uses of `findDOMNode` with React refs
   - Update dependencies that use deprecated APIs when possible
   - For UI libraries using `findDOMNode` (like react-transition-group), consider:
     - Updating to the latest version
     - Using alternative libraries
     - Disabling Strict Mode temporarily if updates aren't possible

2. **Use Function Components with Hooks**
   - Prefer function components with hooks over class components
   - Use the `useRef` hook instead of relying on imperative DOM access

3. **Optimize Re-renders**
   - Use React.memo for components that render often but with the same props
   - Use useCallback and useMemo to prevent unnecessary re-renders
   - Consider using performance monitoring tools to identify render bottlenecks

---

By following these best practices, you can significantly improve the security of your Supabase application and prevent common security issues like those addressed in our recent fixes. 