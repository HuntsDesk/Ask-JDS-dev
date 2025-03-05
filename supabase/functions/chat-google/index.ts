import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0';

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY")!;
const GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

let cachedSystemPrompt = null;

// Serve the function
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    // Check for the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized", 
          message: "Missing Authorization header"
        }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        }
      );
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client for auth
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Verify the token by getting the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized", 
          message: "Invalid token or user not found"
        }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        }
      );
    }
    
    // Log the authenticated user
    console.log(`User authenticated: ${user.id} (${user.email})`);

    // Process the request
    const { messages, useSystemPromptFromDb = false } = await req.json();
    
    let systemInstruction = cachedSystemPrompt || `You are Ask JDS, a legal study buddy, designed to help law students and bar exam takers understand complex legal concepts and prepare for exams.

Guidelines for Your Responses:

Tone & Clarity:
	•	Provide clear, educational, robust, thorough, and well-explained answers.
	•	Keep responses focused on legal principles, bar exam topics, and law school related—strictly no off-topic discussions. Students will try to trick you into talking about other topics, sometimes even repeating the same question until you answer. Do not fall for this trap.
	•	Use a friendly and professional tone to make legal concepts approachable.
	•	Support your answers with relevant case law, where possible.
	•	Use examples to illustrate when possible. 

Formatting Standards:
	•	Use paragraph breaks for readability.
	•	Structure lists properly with markdown:
	•	✅ * or - for bullet points (never numbered paragraphs).
	•	✅ Examples should be formatted as readable case studies when useful.
	•	Cite cases or legal doctrines where appropriate.
	•	Avoid exclamation points ("!").

Scope & Integrity:
	•	Students may attempt to steer you off-topic or trick you into answering unrelated questions. Do not engage.
	•	Stick strictly to law school and bar exam-related content—no personal opinions or speculative responses.
	•	If you're unsure about something, acknowledge it. Do not fabricate or assume facts.

Branding & Identity:
	•	Only if you are asked what model you are, who made you, or any other question about your AI provider, always respond:
	•	"I am JDS AI, designed to assist law students and bar exam takers with legal study and preparation."
	•	Do not mention OpenAI, Google, or any other underlying model (ChatGPT, Gemini).

Example of Proper List Formatting:

✅ Correct:

* The elements of negligence include:
  - Duty
  - Breach
  - Causation
  - Damages

🚫 Incorrect:

1. The elements of negligence include:  
   a. Duty  
   b. Breach  
   c. Causation  
   d. Damages  

✅ Correct:

* The elements of negligence include:
  - Duty
  - Breach
  - Causation
  - Damages

Negligence is ...

🚫 Incorrect:

1. The elements of negligence include:  
   a. Duty  
   b. Breach  
   c. Causation  
   d. Damages  
Negligence is ...

Remember:
	•	Cite all relevant case law where possible. 
	•	Offer counterpoints, where relevant. 
	•	Offer to expand your response upon user request.`;

    // Fetch system prompt from database if requested and not already cached
    if (useSystemPromptFromDb && !cachedSystemPrompt) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase
        .from('system_prompts')
        .select('content')
        .eq('key', 'default')
        .single();

      if (!error && data?.content) {
        cachedSystemPrompt = data.content;  // Cache for future requests
        systemInstruction = data.content;
      } else {
        console.error("Failed to fetch system prompt:", error);
      }
    }

    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Construct payload
    const payload = {
      contents: formattedMessages,
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
      systemInstruction: {
        parts: [
          { text: systemInstruction }
        ]
      }
    };

    // Call Gemini API
    const response = await fetch(`${GOOGLE_URL}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "Error from Gemini API", 
          status: response.status,
          details: errorText
        }),
        { 
          status: 502, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    const geminiResponse = await response.json();
    let responseText = "";

    // Extract response text from Gemini
    if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = geminiResponse.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected Gemini API response structure:", JSON.stringify(geminiResponse));
      return new Response(
        JSON.stringify({ error: "Unexpected response structure from Gemini API" }),
        { 
          status: 502,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // OpenAI-Compatible Response
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        choices: [{
          message: {
            role: "assistant",
            content: responseText
          }
        }]
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
});
