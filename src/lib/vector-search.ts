import { supabase } from './supabase';
import { generateEmbedding, getChatCompletion } from './openai';

async function logError(errorMessage: string, errorStack: string | null = null) {
  await supabase.from('error_logs').insert([
    { message: errorMessage, stack_trace: errorStack }
  ]);
}

async function getActiveSystemPrompt() {
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching system prompt:', error);
      await logError('Error fetching system prompt', error.message);
      return `You are a tutor for law school students and aspiring bar-takers. 
You only provide responses from this perspective. You are NOT providing legal advice. 

Use the following legal context to answer the user's question. If the context doesn't contain relevant information, provide a general response based on your knowledge. 

Never make up a response. If you do not know, clearly say: "I do not know."

Context:
\${context}`;
    }

    return data.content;
  } catch (error) {
    console.error('Unexpected error fetching system prompt:', error);
    await logError('Unexpected error fetching system prompt', error?.toString());
    return null;
  }
}

export async function searchLegalDocuments(query: string) {
  try {
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('search_jds_library', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3
    });

    if (error) {
      console.error('Error searching legal documents:', error);
      await logError('Error searching legal documents', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error searching legal documents:', error);
    await logError('Unexpected error searching legal documents', error?.toString());
    return [];
  }
}

export async function addLegalDocument(title: string, content: string, category: string, tags: string[] = []) {
  try {
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
      .from('jds_library')
      .insert([
        {
          title,
          content,
          embedding,
          category,
          tags
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding legal document:', error);
      await logError('Error adding legal document', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error adding legal document:', error);
    await logError('Unexpected error adding legal document', error?.toString());
    return null;
  }
}

export async function getAIResponse(query: string, context: string) {
  try {
    const systemPrompt = await getActiveSystemPrompt();
    const promptWithContext = systemPrompt?.replace('${context}', context || "No relevant legal documents were found.") || '';

    const response = await getChatCompletion([
      {
        role: 'system',
        content: promptWithContext,
      },
      {
        role: 'user',
        content: query,
      },
    ]);

    return response || 'I do not know. The available legal materials do not cover this question.';
  } catch (error) {
    console.error('Error getting AI response:', error);
    await logError('Error getting AI response', error?.toString());
    return 'There was an error processing your request. Please try again.';
  }
}