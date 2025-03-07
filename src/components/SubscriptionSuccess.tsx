import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LoadingSpinner } from './LoadingSpinner';
import { CheckCircle } from 'lucide-react';
import { getUserSubscription } from '@/lib/subscription';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    async function checkSubscription() {
      try {
        setLoading(true);
        // Wait a moment to allow the webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const subscription = await getUserSubscription(undefined, true);
        setSubscriptionActive(subscription?.status === 'active' || subscription?.status === 'trialing');
      } catch (error) {
        console.error('Error checking subscription status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [sessionId]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            Subscription Successful!
          </CardTitle>
          <CardDescription>
            Thank you for subscribing to JDS Premium!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-6">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-center text-muted-foreground">
                Finalizing your subscription...
              </p>
            </div>
          ) : subscriptionActive ? (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800">
                  Your subscription is now active! You now have full access to all premium features.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Your subscription includes:</h3>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  <li>Full access to JDS curated flashcards</li>
                  <li>Unlimited Ask JDS Chat for instant legal explanations</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                Your payment was successful, but we're still processing your subscription. 
                This should be resolved shortly. Please refresh this page or check back later.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link to="/chat">Go to JDS Chat</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/flashcards">Explore Flashcards</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 