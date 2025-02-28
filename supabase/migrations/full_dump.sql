

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_first_admin"("admin_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if any admin users already exist
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Cannot create first admin: admin users already exist';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;

  -- Update the user's metadata to make them an admin
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."create_first_admin"("admin_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_active_ai_setting"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE ai_settings
  SET is_active = false
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND is_active = true;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_active_ai_setting"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_active_prompt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE prompts
  SET is_active = false
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND is_active = true;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_active_prompt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_users_24h"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  active_count bigint;
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user statistics';
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM auth.users
  WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours';
  
  RETURN active_count;
END;
$$;


ALTER FUNCTION "public"."get_active_users_24h"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users"() RETURNS TABLE("id" "uuid", "email" character varying, "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone, "raw_user_meta_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Add debug logging
  RAISE NOTICE 'Executing get_all_users for user: %', auth.uid();
  RAISE NOTICE 'User is admin: %', auth.is_admin(auth.uid());

  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user data. User: %, Is admin: %', 
      auth.uid(), 
      auth.is_admin(auth.uid());
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::varchar(255), -- Explicit cast to match return type
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_error_logs"() RETURNS TABLE("id" "uuid", "message" "text", "stack_trace" "text", "investigated" boolean, "created_at" timestamp with time zone, "user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view error logs';
  END IF;

  RETURN QUERY
  SELECT el.*
  FROM error_logs el
  ORDER BY el.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_error_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_users"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total bigint;
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user statistics';
  END IF;

  SELECT COUNT(*) INTO total FROM auth.users;
  RETURN total;
END;
$$;


ALTER FUNCTION "public"."get_total_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_message_count"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_id UUID;
  count_value INTEGER;
  first_day_of_month TIMESTAMPTZ;
  last_day_of_month TIMESTAMPTZ;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Return 0 if no user is authenticated
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate the first and last day of the current month
  first_day_of_month := date_trunc('month', now());
  last_day_of_month := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  
  -- First try to get from message_counts table
  SELECT count INTO count_value
  FROM public.message_counts
  WHERE user_id = auth.uid()
    AND period_start >= first_day_of_month
    AND period_end <= last_day_of_month
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If found, return the count
  IF count_value IS NOT NULL THEN
    RETURN count_value;
  END IF;
  
  -- Otherwise, count messages directly
  SELECT COUNT(*)::INTEGER INTO count_value
  FROM public.messages
  WHERE user_id = auth.uid()
    AND role = 'user'
    AND created_at >= first_day_of_month
    AND created_at <= last_day_of_month;
  
  -- Return the count or 0 if null
  RETURN COALESCE(count_value, 0);
END;
$$;


ALTER FUNCTION "public"."get_user_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_message_count"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  message_count INTEGER;
  period_start TIMESTAMP;
  period_end TIMESTAMP;
BEGIN
  -- Set period to current month
  period_start := date_trunc('month', now());
  period_end := date_trunc('month', now()) + interval '1 month' - interval '1 second';
  
  -- First check if we have a record in message_counts
  SELECT count INTO message_count
  FROM message_counts
  WHERE message_counts.user_id = get_user_message_count.user_id
    AND message_counts.period_start <= now()
    AND message_counts.period_end >= now()
  LIMIT 1;
  
  -- If we found a count, return it
  IF message_count IS NOT NULL THEN
    RETURN message_count;
  END IF;
  
  -- Otherwise, count messages directly
  SELECT COUNT(*)::INTEGER INTO message_count
  FROM messages
  WHERE messages.user_id = get_user_message_count.user_id
    AND messages.role = 'user'
    AND messages.created_at >= period_start
    AND messages.created_at <= period_end;
  
  RETURN COALESCE(message_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_user_message_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE raw_user_meta_data->>'is_admin' = 'true'
  );
END;
$$;


ALTER FUNCTION "public"."has_any_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_entitlement"("feature_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_entitlements
    WHERE user_id = auth.uid()
    AND feature = feature_name
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."has_entitlement"("feature_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_entitlement"("user_id" "uuid", "entitlement_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_entitlements
    WHERE user_entitlements.user_id = has_entitlement.user_id
      AND user_entitlements.entitlement = has_entitlement.entitlement_name
      AND user_entitlements.is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."has_entitlement"("user_id" "uuid", "entitlement_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_message_count"() RETURNS integer
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
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Return 0 if no user is authenticated
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate the first and last day of the current month
  first_day_of_month := date_trunc('month', now());
  last_day_of_month := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  
  -- First try to get from message_counts table
  SELECT id, count INTO record_id, current_count
  FROM public.message_counts
  WHERE user_id = auth.uid()
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
  WHERE user_id = auth.uid()
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
    auth.uid(),
    new_count,
    first_day_of_month,
    last_day_of_month
  );
  
  RETURN new_count;
END;
$$;


ALTER FUNCTION "public"."increment_user_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_message_count"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_count INTEGER;
  period_start TIMESTAMP;
  period_end TIMESTAMP;
  existing_record_id UUID;
BEGIN
  -- Set period to current month
  period_start := date_trunc('month', now());
  period_end := date_trunc('month', now()) + interval '1 month' - interval '1 second';
  
  -- Check if a record exists for this period
  SELECT id, count INTO existing_record_id, new_count
  FROM message_counts
  WHERE message_counts.user_id = increment_user_message_count.user_id
    AND message_counts.period_start <= now()
    AND message_counts.period_end >= now()
  LIMIT 1
  FOR UPDATE;
  
  IF existing_record_id IS NOT NULL THEN
    -- Update existing record
    new_count := new_count + 1;
    
    UPDATE message_counts
    SET count = new_count,
        updated_at = now()
    WHERE id = existing_record_id;
  ELSE
    -- Count existing messages
    SELECT COUNT(*)::INTEGER INTO new_count
    FROM messages
    WHERE messages.user_id = increment_user_message_count.user_id
      AND messages.role = 'user'
      AND messages.created_at >= period_start
      AND messages.created_at <= period_end;
    
    -- Add 1 for the new message
    new_count := COALESCE(new_count, 0) + 1;
    
    -- Create new record
    INSERT INTO message_counts (
      user_id,
      count,
      period_start,
      period_end,
      created_at,
      updated_at
    ) VALUES (
      increment_user_message_count.user_id,
      new_count,
      period_start,
      period_end,
      now(),
      now()
    );
  END IF;
  
  RETURN new_count;
END;
$$;


ALTER FUNCTION "public"."increment_user_message_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN auth.is_admin();
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id UUID;
  is_admin_value BOOLEAN;
BEGIN
  -- If no user_id provided, use the current user
  IF user_id IS NULL THEN
    target_user_id := auth.uid();
  ELSE
    target_user_id := user_id;
  END IF;
  
  -- Return false if no user is authenticated or provided
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the user is an admin
  SELECT (raw_user_meta_data->>'is_admin')::BOOLEAN INTO is_admin_value
  FROM auth.users
  WHERE id = target_user_id;
  
  -- Return the result or false if null
  RETURN COALESCE(is_admin_value, false);
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_error_investigated"("error_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update error logs';
  END IF;

  UPDATE error_logs
  SET investigated = NOT investigated
  WHERE id = error_id;
END;
$$;


ALTER FUNCTION "public"."mark_error_investigated"("error_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_admin"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only administrators can revoke admin status';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Update the user's metadata to remove admin status
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'is_admin'
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."revoke_admin"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_admin"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can revoke admin status';
  END IF;

  -- Update the user's metadata to remove admin status
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'is_admin'
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."revoke_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_to_admin"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only administrators can upgrade users to admin status';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Update the user's metadata to include admin status
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."upgrade_to_admin"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_to_admin"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can upgrade users to admin status';
  END IF;

  -- Update the user's metadata to include admin status
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."upgrade_to_admin"("user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "ai_settings_provider_check" CHECK (("provider" = ANY (ARRAY['openai'::"text", 'gemini'::"text"])))
);


ALTER TABLE "public"."ai_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "stack_trace" "text",
    "investigated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "thread_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."models" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "api_key_required" boolean DEFAULT false,
    "max_tokens" integer DEFAULT 4096,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "model_version" "text",
    "provider" "text",
    "is_public" boolean DEFAULT false
);


ALTER TABLE "public"."models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "stripe_customer_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."system_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "feature" "text" NOT NULL,
    "status" "text" DEFAULT 'inactive'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_entitlements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."user_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_settings"
    ADD CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_counts"
    ADD CONSTRAINT "message_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."system_prompts"
    ADD CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."threads"
    ADD CONSTRAINT "threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_entitlements"
    ADD CONSTRAINT "user_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_entitlements"
    ADD CONSTRAINT "user_entitlements_user_id_feature_key" UNIQUE ("user_id", "feature");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "threads_created_at_idx" ON "public"."threads" USING "btree" ("created_at");



CREATE INDEX "threads_user_id_idx" ON "public"."threads" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."ai_settings"
    ADD CONSTRAINT "ai_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_counts"
    ADD CONSTRAINT "message_counts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_prompts"
    ADD CONSTRAINT "system_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."threads"
    ADD CONSTRAINT "threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_entitlements"
    ADD CONSTRAINT "user_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admin users can view all data" ON "public"."users" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."is_admin" = true)))));



CREATE POLICY "Admins can manage AI settings" ON "public"."ai_settings";



CREATE POLICY "Admins can manage all profiles" ON "public"."profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Admins can manage system prompts" ON "public"."system_prompts" USING ("auth"."is_admin"());



CREATE POLICY "Admins can read all entitlements_secure" ON "public"."user_entitlements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "All users can read active prompt" ON "public"."system_prompts" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "All users can read active setting" ON "public"."ai_settings" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Only admins can view error logs" ON "public"."error_logs" FOR SELECT USING ("auth"."is_admin"());



CREATE POLICY "Only service role can insert/update/delete message counts" ON "public"."message_counts" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Only service role can insert/update/delete subscriptions" ON "public"."user_subscriptions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage entitlements" ON "public"."user_entitlements" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create error logs" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create messages in own threads" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."threads"
  WHERE (("threads"."id" = "messages"."thread_id") AND ("threads"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own threads" ON "public"."threads" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own threads" ON "public"."threads" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their own entitlements" ON "public"."user_entitlements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own threads" ON "public"."threads" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view messages from own threads" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."threads"
  WHERE (("threads"."id" = "messages"."thread_id") AND ("threads"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own threads" ON "public"."threads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own message counts" ON "public"."message_counts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."user_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_all_secure" ON "public"."models" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



ALTER TABLE "public"."ai_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_counts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "models_access" ON "public"."models" TO "authenticated" USING (("auth"."is_admin"() OR ("is_public" = true)));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads_delete_policy" ON "public"."threads" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "threads_insert_policy" ON "public"."threads" FOR INSERT TO "authenticated" WITH CHECK ((COALESCE("user_id", "auth"."uid"()) = "auth"."uid"()));



CREATE POLICY "threads_select_policy" ON "public"."threads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "threads_update_policy" ON "public"."threads" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_entitlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime_messages_publication" OWNER TO "supabase_admin";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."threads";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."create_first_admin"("admin_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_first_admin"("admin_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_first_admin"("admin_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_setting"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_setting"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_setting"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_active_prompt"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_active_prompt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_active_prompt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_users_24h"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_users_24h"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_users_24h"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_error_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_error_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_error_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_message_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_message_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_message_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_message_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_entitlement"("feature_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_entitlement"("feature_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_entitlement"("feature_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_entitlement"("user_id" "uuid", "entitlement_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_entitlement"("user_id" "uuid", "entitlement_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_entitlement"("user_id" "uuid", "entitlement_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_message_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_message_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_message_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_message_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_error_investigated"("error_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_error_investigated"("error_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_error_investigated"("error_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_admin"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_admin"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_admin"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_to_admin"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."ai_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_settings" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."message_counts" TO "anon";
GRANT ALL ON TABLE "public"."message_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."message_counts" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."models" TO "anon";
GRANT ALL ON TABLE "public"."models" TO "authenticated";
GRANT ALL ON TABLE "public"."models" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."system_prompts" TO "anon";
GRANT ALL ON TABLE "public"."system_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."system_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."threads" TO "anon";
GRANT ALL ON TABLE "public"."threads" TO "authenticated";
GRANT ALL ON TABLE "public"."threads" TO "service_role";



GRANT ALL ON TABLE "public"."user_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."user_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
