# Reducing Toast Notifications

To reduce the number of toast notifications that appear when logging in, you can make the following changes:

## 1. Modify the Toast Removal Delay

In `src/hooks/use-toast.ts`, change the `TOAST_REMOVE_DELAY` constant to a shorter value:

```typescript
// Change from:
const TOAST_REMOVE_DELAY = 1000000;

// To:
const TOAST_REMOVE_DELAY = 5000; // 5 seconds
```

## 2. Increase the Toast Limit

In the same file, you can also modify the `TOAST_LIMIT` to allow more toasts to be displayed at once:

```typescript
// Change from:
const TOAST_LIMIT = 1;

// To:
const TOAST_LIMIT = 3;
```

## 3. Increase Timeout Durations

To prevent timeouts from occurring too quickly, you can increase the timeout durations in these files:

### In `src/components/chat/ChatLayout.tsx`:

```typescript
// Change timeout from 8000ms to 15000ms (15 seconds)
timeoutId = setTimeout(() => {
  console.log('ChatLayout: Threads loading safety timeout triggered');
  setLoadingTimeout(true);
  toast({
    title: "Loading taking longer than expected",
    description: "We're having trouble loading your conversations. The database might be slow to respond.",
    variant: "destructive",
  });
}, 15000); // Increased from 8000ms to 15000ms
```

### In `src/hooks/use-threads.ts`:

```typescript
// Change timeout from 8000ms to 15000ms (15 seconds)
const safetyTimeoutId = setTimeout(() => {
  if (isMounted && loading) {
    console.warn('useThreads: Safety timeout triggered after 15 seconds');
    setLoading(false);
    setError(new Error('Loading threads timed out. Please try again.'));
    
    // Only show toast after a delay on initial load
    if (initialLoadRef.current) {
      // Clear any existing timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      
      // Set a new timeout to show the toast after 2 seconds
      toastTimeoutRef.current = setTimeout(() => {
        toast({
          title: "Loading threads timeout",
          description: "We're having trouble loading your conversations. The database might be slow to respond.",
          variant: "destructive",
        });
        toastTimeoutRef.current = null;
      }, 2000);
    } else {
      toast({
        title: "Loading threads timeout",
        description: "We're having trouble loading your conversations. The database might be slow to respond.",
        variant: "destructive",
      });
    }
  }
}, 15000); // Increased from 8000ms to 15000ms
```

## 4. Consolidate Similar Notifications

You can also modify the code to consolidate similar notifications. For example, in `src/lib/subscription.ts`, you can add a flag to prevent showing multiple subscription-related errors:

```typescript
// Add at the top of the file
let hasShownSubscriptionError = false;

// Then in the error handling code:
if (!hasShownSubscriptionError) {
  toast({
    title: "Subscription data issue",
    description: "We're having trouble loading your subscription information. Some features may be limited.",
    variant: "warning",
  });
  hasShownSubscriptionError = true;
}
```

## 5. Fix the 406 Errors

The most important step is to run the SQL commands in the `fix_subscription_issues.sql` file to fix the underlying 406 errors. This will:

1. Create the `user_subscriptions` table if it doesn't exist
2. Add default subscription records for all users
3. Set up a trigger to automatically create subscription records for new users
4. Configure proper Row Level Security (RLS) policies

After applying these changes, the 406 errors should be resolved, which will eliminate many of the toast notifications. 