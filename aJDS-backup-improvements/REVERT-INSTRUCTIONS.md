# Instructions for Reverting to Last Known Good State

If you need to revert to the last known good state of the application, follow these steps:

## Using Git

If you're using Git for version control (recommended):

1. **Find the last known good commit**:
   ```bash
   git log --oneline
   ```

2. **Revert to that commit**:
   ```bash
   git checkout <commit-hash>
   ```

3. **Create a new branch from this state**:
   ```bash
   git checkout -b stable-version
   ```

4. **Install dependencies and run the app**:
   ```bash
   npm install
   npm run dev
   ```

## Manual Revert

If you don't have a Git history or need to manually revert:

1. **Backup your current code**:
   ```bash
   cp -r /path/to/project /path/to/backup
   ```

2. **Restore from a previous backup** (if available)

3. **Fix the critical BrowserRouter issue**:
   - Edit `src/main.tsx` to include the BrowserRouter as shown in `backup-improvements/main.tsx`
   - This is the most critical fix needed for the app to function

## Incremental Improvements

After reverting to a stable state, you can incrementally add back the improvements:

1. Start with the BrowserRouter fix (if not already applied)
2. Implement the Supabase singleton pattern to fix the "Multiple GoTrueClient instances" warning
3. Add the auth utilities one by one, testing after each addition
4. Implement the profile and entitlements caching

## Testing After Revert

After reverting, test these critical flows:

1. **Authentication**:
   - Sign in
   - Sign up
   - Sign out
   - Session persistence

2. **Navigation**:
   - Home page
   - Chat page
   - Admin page (if you're an admin)

3. **Entitlements**:
   - Access to features based on entitlements

## Getting Help

If you continue to experience issues after reverting:

1. Check the browser console for errors
2. Look at the Supabase logs for authentication issues
3. Verify your environment variables are correctly set
4. Ensure your Supabase project is online and accessible 