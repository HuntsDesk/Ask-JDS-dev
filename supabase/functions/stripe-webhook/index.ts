import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

// CORS headers for public access
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Skip database operations for test events
const SKIP_DB_FOR_TEST_EVENTS = true;

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

console.log('Stripe webhook function loaded');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Received OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`Received ${req.method} request`);
    
    // Get the request body as text
    const body = await req.text();
    console.log(`Request body preview: ${body.substring(0, 100)}...`);
    
    // Parse the event data
    let event;
    try {
      event = JSON.parse(body);
      console.log(`Event type: ${event.type}`);
    } catch (err) {
      console.error(`Error parsing JSON: ${err.message}`);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 200, // Return 200 even for errors to avoid Stripe retries
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 200, // Return 200 to avoid Stripe retries
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Determine if this is a test event
    const isTestEvent = event.id?.startsWith('evt_') && event.id?.includes('_test_');
    console.log(`Is test event: ${isTestEvent}`);
    
    // Process the webhook event
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event');
        const session = event.data.object;
        
        // For test events, there might not be a valid subscription
        if (!session.subscription) {
          console.log('No subscription ID in session - likely a test event');
          break;
        }
        
        const userId = session.metadata?.userId;
        if (!userId) {
          console.error('No user ID found in session metadata');
          break;
        }
        
        console.log(`Checkout completed for user ${userId}, subscription ${session.subscription}`);
        
        // Skip database operations for test events if configured
        if (isTestEvent && SKIP_DB_FOR_TEST_EVENTS) {
          console.log('Skipping database operations for test event');
          break;
        }
        
        try {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Insert the subscription into the database
          const { error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              subscription_id: subscription.id,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity || 1,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              created_at: new Date().toISOString(),
              stripe_customer_id: subscription.customer as string,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
              canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            });
          
          if (error) {
            console.error(`Error inserting subscription: ${error.message}`);
          } else {
            console.log(`Subscription ${subscription.id} created for user ${userId}`);
          }
        } catch (err) {
          console.error(`Error processing subscription: ${err.message}`);
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        console.log('Processing customer.subscription.updated event');
        const subscription = event.data.object;
        
        // Skip database operations for test events if configured
        if (isTestEvent && SKIP_DB_FOR_TEST_EVENTS) {
          console.log('Skipping database operations for test event');
          break;
        }
        
        try {
          // Find the user ID associated with this subscription
          const { data: userData, error: userError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('subscription_id', subscription.id)
            .single();
          
          if (userError || !userData) {
            console.error(`No user found for subscription: ${subscription.id}`);
            break;
          }
          
          // Update the subscription in the database
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userData.user_id,
              subscription_id: subscription.id,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity || 1,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              stripe_customer_id: subscription.customer as string,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
              canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            });
          
          if (error) {
            console.error(`Error updating subscription: ${error.message}`);
          } else {
            console.log(`Subscription ${subscription.id} updated for user ${userData.user_id}`);
          }
        } catch (err) {
          console.error(`Error processing subscription update: ${err.message}`);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        console.log('Processing customer.subscription.deleted event');
        const subscription = event.data.object;
        
        // Skip database operations for test events if configured
        if (isTestEvent && SKIP_DB_FOR_TEST_EVENTS) {
          console.log('Skipping database operations for test event');
          break;
        }
        
        try {
          // Find the user ID associated with this subscription
          const { data: userData, error: userError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('subscription_id', subscription.id)
            .single();
          
          if (userError || !userData) {
            console.error(`No user found for subscription: ${subscription.id}`);
            break;
          }
          
          // Update the subscription in the database
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userData.user_id,
              subscription_id: subscription.id,
              status: 'canceled',
              price_id: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity || 1,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              stripe_customer_id: subscription.customer as string,
              ended_at: new Date().toISOString(),
              cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
              canceled_at: new Date().toISOString(),
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            });
          
          if (error) {
            console.error(`Error updating subscription: ${error.message}`);
          } else {
            console.log(`Subscription ${subscription.id} canceled for user ${userData.user_id}`);
          }
        } catch (err) {
          console.error(`Error processing subscription deletion: ${err.message}`);
        }
        
        break;
      }
      
      // Handle other events
      default:
        console.log(`Received event of type ${event.type} - no action needed`);
    }

    return new Response(
      JSON.stringify({ success: true, event_type: event.type }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error(`Error handling webhook: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200, // Return 200 even for errors to avoid Stripe retries
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}); 