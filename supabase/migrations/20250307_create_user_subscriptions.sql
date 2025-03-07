-- Create the user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    subscription_id TEXT NOT NULL,
    status TEXT NOT NULL,
    price_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    UNIQUE(subscription_id)
);

-- Add RLS policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Add function and trigger to check subscription status
CREATE OR REPLACE FUNCTION public.is_subscription_active(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_subscriptions 
        WHERE user_id = user_uuid 
        AND status IN ('active', 'trialing')
        AND (current_period_end > NOW() OR current_period_end IS NULL)
    ) INTO active;
    
    RETURN active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON public.user_subscriptions(user_id); 