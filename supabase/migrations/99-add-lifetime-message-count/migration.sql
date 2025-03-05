-- Add lifetime_message_count column to users table
ALTER TABLE IF EXISTS "public"."users" 
ADD COLUMN IF NOT EXISTS "lifetime_message_count" INTEGER DEFAULT 0 NOT NULL;

-- Create a new function to increment the lifetime message count
CREATE OR REPLACE FUNCTION "public"."increment_lifetime_message_count"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get the current user ID or use the provided one
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get current lifetime count
  SELECT lifetime_message_count INTO current_count
  FROM public.users
  WHERE id = user_id;
  
  -- If user record doesn't exist yet, create it
  IF current_count IS NULL THEN
    INSERT INTO public.users (id, email, lifetime_message_count)
    SELECT 
      user_id,
      (SELECT email FROM auth.users WHERE id = user_id),
      1
    ON CONFLICT (id) DO UPDATE
    SET lifetime_message_count = public.users.lifetime_message_count + 1;
    
    new_count := 1;
  ELSE
    -- Increment the count
    new_count := current_count + 1;
    
    UPDATE public.users
    SET lifetime_message_count = new_count
    WHERE id = user_id;
  END IF;
  
  RETURN new_count;
END;
$$;

-- Modify the existing increment_user_message_count function to also increment lifetime count
CREATE OR REPLACE FUNCTION "public"."increment_user_message_count"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_id UUID;
  current_count INTEGER;
  new_count INTEGER;
  record_id UUID;
  first_day_of_month TIMESTAMPTZ;
  last_day_of_month TIMESTAMPTZ;
  lifetime_count INTEGER;
BEGIN
  -- Get the current user ID or use the provided one
  user_id := COALESCE(user_id, auth.uid());
  
  -- Return 0 if no user is authenticated
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Also increment the lifetime message count
  PERFORM public.increment_lifetime_message_count(user_id);
  
  -- Calculate the first and last day of the current month
  first_day_of_month := date_trunc('month', now());
  last_day_of_month := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  
  -- First try to get from message_counts table
  SELECT id, count INTO record_id, current_count
  FROM public.message_counts
  WHERE user_id = user_id
    AND period_start >= first_day_of_month
    AND period_end <= last_day_of_month
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If found, increment the count
  IF record_id IS NOT NULL THEN
    new_count := current_count + 1;
    
    UPDATE public.message_counts
    SET count = new_count, updated_at = now()
    WHERE id = record_id;
    
    RETURN new_count;
  END IF;
  
  -- Otherwise, count messages directly
  SELECT COUNT(*)::INTEGER INTO current_count
  FROM public.messages
  WHERE user_id = user_id
    AND role = 'user'
    AND created_at >= first_day_of_month
    AND created_at <= last_day_of_month;
  
  -- Calculate new count
  new_count := COALESCE(current_count, 0) + 1;
  
  -- Insert new record
  INSERT INTO public.message_counts (
    user_id,
    count,
    period_start,
    period_end
  ) VALUES (
    user_id,
    new_count,
    first_day_of_month,
    last_day_of_month
  );
  
  RETURN new_count;
END;
$$;

-- Create a function to get user's lifetime message count
CREATE OR REPLACE FUNCTION "public"."get_lifetime_message_count"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  lifetime_count INTEGER;
BEGIN
  -- Get the current user ID or use the provided one
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get current lifetime count
  SELECT lifetime_message_count INTO lifetime_count
  FROM public.users
  WHERE id = user_id;
  
  RETURN COALESCE(lifetime_count, 0);
END;
$$; 