import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY")!;
const MODEL_NAME = "gemini-pro"; // Make configurable if needed

const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${GOOGLE_API_KEY}`;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const { messages = [], prompt } = await req.json();

    console.log("Incoming request:", {
      messagesCount: messages.length,
      promptLength: prompt?.length,
      prompt: prompt?.slice(0, 100)
    });

    // Validate request
    if (!messages || !Array.isArray(messages) || !prompt) {
      console.error("Invalid request payload");
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate API key
    if (!GOOGLE_API_KEY) {
      console.error("Missing Google API key");
      return new Response(
        JSON.stringify({ error: "API configuration error" }), 
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch system prompt
    const { data: systemPrompts, error: promptError } = await supabase
      .from("system_prompts")
      .select("content")
      .eq("provider", "google")
      .eq("is_active", true)
      .single();

    if (promptError) {
      console.error("Error fetching system prompt:", promptError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch system prompt" }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const systemPrompt = systemPrompts?.content || "You are a helpful AI assistant.";
    console.log("Retrieved system prompt:", systemPrompt.slice(0, 100));

    // Format conversation history
    const formattedHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Construct conversation with enforced system prompt
    const contents = [
      {
        role: "user",
        parts: [{ 
          text: `[SYSTEM DIRECTIVE - MANDATORY]\n\n${systemPrompt}\n\nYou must maintain this exact role and never break character.` 
        }]
      },
      {
        role: "model",
        parts: [{ 
          text: "I understand and acknowledge these directives. I will maintain this role consistently." 
        }]
      },
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ];

    // Log the full formatted request
    console.log("Formatted Gemini API request:", JSON.stringify({
      contents: contents.map(c => ({
        role: c.role,
        text: c.parts[0].text.slice(0, 100) + "..."
      })),
      messageCount: contents.length
    }, null, 2));

    try {
      const response = await fetch(GOOGLE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_DEROGATORY",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_TOXICITY",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      const responseData = await response.json();

      // Check for API errors
      if (!response.ok) {
        console.error("Gemini API Error:", {
          status: response.status,
          error: responseData
        });
        return new Response(
          JSON.stringify({ 
            error: "Gemini API request failed", 
            details: responseData.error?.message || "Unknown error"
          }), 
          { status: response.status, headers: corsHeaders }
        );
      }

      // Validate response structure
      if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Invalid API response structure:", responseData);
        return new Response(
          JSON.stringify({ error: "Invalid API response format" }), 
          { status: 500, headers: corsHeaders }
        );
      }
      
      // Log detailed response information
      console.log("Gemini API Response:", {
        status: response.status,
        safetyRatings: responseData.candidates[0].safetyRatings,
        responsePreview: responseData.candidates[0].content.parts[0].text.slice(0, 100),
        finishReason: responseData.candidates[0].finishReason
      });

      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: corsHeaders
      });

    } catch (apiError) {
      console.error("Gemini API call failed:", apiError);
      return new Response(
        JSON.stringify({ error: "Failed to communicate with Gemini API" }), 
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }), 
      { status: 500, headers: corsHeaders }
    );
  }
});