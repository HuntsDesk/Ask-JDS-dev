import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { createCheckoutSession } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, MessageSquare, Clock } from 'lucide-react';

interface FlashcardPaywallProps {
  onCancel?: () => void;
}

export function FlashcardPaywall({ onCancel }: FlashcardPaywallProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast, dismiss } = useToast();

  // Dismiss toasts when component mounts
  React.useEffect(() => {
    dismiss();
    
    // And also set up a small delay to ensure all toast animations are cleared
    const timeoutId = setTimeout(() => {
      dismiss();
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
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
    // Dismiss any toasts before closing the paywall
    dismiss();
    
    // Call the onCancel callback
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full" style={{ position: 'absolute', zIndex: 9999 }}>
        <CardHeader>
          <CardTitle className="text-2xl">Unlock JDS Premium Flashcards</CardTitle>
          <CardDescription>
            You can create unlimited flashcards for free—no catch. But if you want access to Ask JDS Chat and our expert-curated flashcards, you must subscribe. Gotta put food on the table, kids!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">For just $5/month, you get:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <BookOpen className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Full access to JDS curated flashcards—study smarter, not harder</span>
              </li>
              <li className="flex items-start">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Unlimited Ask JDS Chat for instant legal explanations</span>
              </li>
              <li className="flex items-start">
                <Clock className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                <span>A study buddy who won't judge your late-night cram sessions</span>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">$5/month</p>
            <p className="text-sm italic text-muted-foreground">Smarter than your group chat. Cheaper than failing out of law school.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
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