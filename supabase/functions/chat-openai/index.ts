// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestPayload {
  messages: ChatMessage[];
}

interface SystemPrompt {
  content: string;
}

// Environment configuration
const config = {
  openaiApiKey: Deno.env.get("OPENAI_API_KEY")!,
  supabaseUrl: Deno.env.get("SUPABASE_URL")!,
  supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  openaiUrl: "https://api.openai.com/v1/chat/completions",
  environment: Deno.env.get("ENVIRONMENT"),
  allowedOrigin: Deno.env.get("ALLOWED_ORIGIN") || "https://your-production-domain.com"
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

// CORS configuration
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": config.environment === "production" ? config.allowedOrigin : "*"
};

async function getSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from("system_prompts")
    .select("content")
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching system prompt:", error);
    return "You are a legal study assistant, helping law students understand complex legal concepts and prepare for exams.";
  }

  return (data as SystemPrompt).content;
}

async function handleChatRequest(req: Request): Promise<Response> {
  // Verify authentication
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Parse request payload
  const { messages } = await req.json() as ChatRequestPayload;
  if (!messages || !Array.isArray(messages)) {
    throw new Error("Invalid request payload");
  }

  // Get system prompt
  const systemPrompt = await getSystemPrompt();

  // Prepare OpenAI request
  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 2048
  };

  // Call OpenAI API
  const response = await fetch(config.openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
  }

  // Process and sanitize response
  const rawResponse = await response.json();
  const sanitizedResponse = {
    id: rawResponse.id,
    choices: rawResponse.choices,
    usage: {
      total_tokens: rawResponse.usage.total_tokens
    }
  };

  return new Response(JSON.stringify(sanitizedResponse), {
    status: response.status,
    headers: corsHeaders
  });
}

// Main request handler
serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    return await handleChatRequest(req);
  } catch (error) {
    console.error("Error in chat-openai function:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      {
        status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
        headers: corsHeaders
      }
    );
  }
});
