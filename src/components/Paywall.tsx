import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { createCheckoutSession, FREE_MESSAGE_LIMIT } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { setPaywallActive } from '@/hooks/use-toast';

interface PaywallProps {
  onCancel?: () => void;
  preservedMessage?: string;
}

export function Paywall({ onCancel, preservedMessage }: PaywallProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast, dismiss } = useToast();

  // Set the global paywall flag when this component mounts
  React.useEffect(() => {
    // Dismiss toasts immediately when the component mounts
    dismiss();
    
    // Set the global flag
    setPaywallActive(true);
    
    // And also set up a small delay to ensure all toast animations are cleared
    const timeoutId = setTimeout(() => {
      dismiss();
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      // Reset the global flag when unmounting
      setPaywallActive(false);
      // Also dismiss toasts when unmounting to avoid flashes
      dismiss();
    };
  }, [dismiss]);
  
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      const checkoutUrl = await createCheckoutSession();
      
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
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    // Reset the global paywall flag
    setPaywallActive(false);
  
    // Dismiss any toasts before closing the paywall
    dismiss();
    
    // Call the onCancel callback
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full"
        style={{ position: 'absolute', zIndex: 9999 }}>
        <CardHeader>
          <CardTitle className="text-2xl">Your AI study buddy is taking a recess.</CardTitle>
          <CardDescription>
            You've hit your free message limit, but don't worry—you can upgrade for unlimited access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">For just $5/month, you get:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 mr-2 text-green-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Unlimited Ask JDS Messaging (because law school never stops)
              </li>
              <li className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 mr-2 text-green-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Answers trained on real law student resources
              </li>
              <li className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 mr-2 text-green-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                JDS Flashcards – use ours or create your own
              </li>
              <li className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 mr-2 text-green-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                A study buddy who won't cold-call you
              </li>
            </ul>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">$5/month</p>
            <p className="text-sm italic text-muted-foreground">Smarter than your group chat. Cheaper than failing the bar.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              'Upgrade Now'
            )}
          </Button>
          {onCancel && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Maybe Later
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 