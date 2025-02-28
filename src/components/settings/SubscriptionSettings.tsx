import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  getUserSubscription, 
  createCheckoutSession, 
  createCustomerPortalSession,
  getUserMessageCount,
  FREE_MESSAGE_LIMIT
} from '@/lib/subscription';
import { formatDate } from '@/lib/utils';

// Constants
const FREE_TIER_LIMIT = FREE_MESSAGE_LIMIT;
const SUBSCRIPTION_PRICE = '$9.99';

export function SubscriptionSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);
  const { toast } = useToast();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadSubscriptionData() {
      try {
        setIsLoading(true);
        
        // Set a safety timeout to prevent infinite loading
        loadingTimeoutRef.current = setTimeout(() => {
          console.log('Safety timeout triggered for subscription data loading');
          setIsLoading(false);
          toast({
            title: 'Loading timeout',
            description: 'Subscription data is taking longer than expected to load. Some information may be incomplete.',
            variant: 'default',
          });
        }, 8000); // 8 second timeout (increased from 5 seconds)
        
        // Try to load subscription data with error handling for each promise
        let subscriptionData = null;
        let count = 0;
        
        try {
          subscriptionData = await getUserSubscription();
          console.log('Subscription data loaded:', subscriptionData);
        } catch (subError) {
          console.error('Error loading subscription:', subError);
        }
        
        try {
          count = await getUserMessageCount();
          console.log('Message count loaded:', count);
        } catch (countError) {
          console.error('Error loading message count:', countError);
        }
        
        setSubscription(subscriptionData);
        setMessageCount(count);
      } catch (error) {
        console.error('Error loading subscription data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        // Clear the timeout if data loaded successfully
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setIsLoading(false);
      }
    }

    loadSubscriptionData();
    
    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [toast]);

  const handleSubscribe = async () => {
    try {
      setIsActionLoading(true);
      
      // Set a safety timeout for the subscription action
      const actionTimeoutId = setTimeout(() => {
        setIsActionLoading(false);
        toast({
          title: 'Request timeout',
          description: 'The subscription request is taking longer than expected. Please try again.',
          variant: 'destructive',
        });
      }, 10000); // 10 second timeout
      
      const checkoutUrl = await createCheckoutSession();
      
      // Clear the timeout as we got a response
      clearTimeout(actionTimeoutId);
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create checkout session. Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsActionLoading(true);
      
      // Set a safety timeout for the manage subscription action
      const actionTimeoutId = setTimeout(() => {
        setIsActionLoading(false);
        toast({
          title: 'Request timeout',
          description: 'The request is taking longer than expected. Please try again.',
          variant: 'destructive',
        });
      }, 10000); // 10 second timeout
      
      const portalUrl = await createCustomerPortalSession();
      
      // Clear the timeout as we got a response
      clearTimeout(actionTimeoutId);
      
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to access subscription portal. Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accessing subscription portal:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper function to determine if user is on free tier
  const isFreeTier = () => {
    return !subscription || subscription.status !== 'active';
  };

  // Helper function to format subscription end date
  const formatSubscriptionEndDate = () => {
    if (!subscription || !subscription.current_period_end) {
      return 'Unknown';
    }
    return formatDate(new Date(subscription.current_period_end));
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading your subscription information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <LoadingSpinner className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          {isFreeTier() 
            ? 'You are currently on the free tier' 
            : 'You have an active subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Current Plan</h3>
          <p className="text-sm text-muted-foreground">
            {isFreeTier() ? 'Free Tier' : 'Premium Plan'}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium">Usage</h3>
          <p className="text-sm text-muted-foreground">
            {messageCount} / {isFreeTier() ? FREE_TIER_LIMIT : 'Unlimited'} messages this month
          </p>
          {isFreeTier() && messageCount >= FREE_TIER_LIMIT && (
            <p className="text-sm text-red-500 mt-1">
              You've reached your free tier limit. Upgrade to continue.
            </p>
          )}
        </div>

        {!isFreeTier() && (
          <div>
            <h3 className="text-lg font-medium">Renewal</h3>
            <p className="text-sm text-muted-foreground">
              Your subscription {subscription?.cancel_at_period_end ? 'will end' : 'renews'} on {formatSubscriptionEndDate()}
            </p>
            {subscription?.cancel_at_period_end && (
              <p className="text-sm text-amber-500 mt-1">
                Your subscription is set to cancel at the end of the current period.
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isFreeTier() ? (
          <Button 
            onClick={handleSubscribe} 
            disabled={isActionLoading}
            className="w-full"
          >
            {isActionLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>Upgrade to Premium ({SUBSCRIPTION_PRICE}/month)</>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleManageSubscription} 
            disabled={isActionLoading}
            variant="outline" 
            className="w-full"
          >
            {isActionLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>Manage Subscription</>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 