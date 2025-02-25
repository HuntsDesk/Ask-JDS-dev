import { serve } from "https://deno.land/std/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY")!;
const GOOGLE_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const { messages } = await req.json();

  const systemPrompt = `[SYSTEM DIRECTIVE - MANDATORY]\nYou are a strict assistant that follows exact rules.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      ...messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }))
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(GOOGLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
});
