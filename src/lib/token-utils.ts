import type { Message } from '@/types';

// Constants
export const MAX_TOKENS = 8192;  // Maximum context window
export const MAX_RESPONSE_TOKENS = 1000;  // Reserved for AI's response
export const MAX_MESSAGES = 10;  // Maximum number of past messages to include
export const TOKEN_LIMIT = MAX_TOKENS - MAX_RESPONSE_TOKENS;

interface TokenizedMessage {
  message: Message;
  tokens: number;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// Simple token estimation (4 characters ≈ 1 token)
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function prepareConversationHistory(
  messages: Message[],
  systemPrompt: string,
  prompt: string
): GeminiMessage[] {
  // Count system prompt tokens
  const systemTokens = countTokens(systemPrompt);
  const newPromptTokens = countTokens(prompt);
  const availableTokens = TOKEN_LIMIT - systemTokens - newPromptTokens;

  // Tokenize all messages
  const tokenizedMessages: TokenizedMessage[] = messages.map(msg => ({
    message: msg,
    tokens: countTokens(msg.content)
  }));

  // Get last 10 messages
  const recentMessages = tokenizedMessages
    .slice(-MAX_MESSAGES)
    .reverse();

  // Add messages while we have token space
  const selectedMessages: Message[] = [];
  let totalTokens = 0;

  for (const { message, tokens } of recentMessages) {
    if (totalTokens + tokens > availableTokens) {
      break;
    }
    selectedMessages.unshift(message);
    totalTokens += tokens;
  }

  return selectedMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}

export function summarizeConversation(messages: Message[]): string {
  // Create a brief summary of older messages
  const summary = messages
    .map(msg => `${msg.role}: ${msg.content.slice(0, 100)}...`)
    .join('\n');
  
  return `Previous conversation summary:\n${summary}`;
}