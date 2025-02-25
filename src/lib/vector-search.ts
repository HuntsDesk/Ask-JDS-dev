import { supabase } from './supabase';

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

export async function searchLegalDocuments(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('search_documents', {
      query_text: query,
      match_threshold: 0.5,
      match_count: 3
    });

    if (error) {
      console.error('Error searching legal documents:', error);
      await logError(error, 'Error searching legal documents');
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error searching legal documents:', error);
    await logError(error, 'Unexpected error searching legal documents');
    return [];
  }
}

export async function addLegalDocument(title: string, content: string, category: string, tags: string[] = []) {
  try {
    const { data, error } = await supabase
      .from('jds_library')
      .insert([
        {
          title,
          content,
          category,
          tags
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding legal document:', error);
      await logError(error, 'Error adding legal document');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error adding legal document:', error);
    await logError(error, 'Unexpected error adding legal document');
    return null;
  }
}

export async function getAIResponse(query: string, context: string) {
  try {
    const systemPrompt = await getSystemPrompt();
    const promptWithContext = systemPrompt?.replace('${context}', context || "No relevant legal documents were found.") || '';

    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        messages: [
          {
            role: 'system',
            content: promptWithContext,
          },
          {
            role: 'user',
            content: query,
          },
        ]
      }
    });

    if (error) throw error;
    return data?.response || 'I do not know. The available legal materials do not cover this question.';
  } catch (error) {
    console.error('Error getting AI response:', error);
    await logError(error, 'Error getting AI response');
    return 'There was an error processing your request. Please try again.';
  }
}

async function getSystemPrompt(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching system prompt:', error);
      await logError(error, 'Error fetching system prompt');
      return 'You are a tutor for law school students and aspiring bar-takers.';
    }

    return data.content;
  } catch (error) {
    console.error('Unexpected error fetching system prompt:', error);
    await logError(error, 'Unexpected error fetching system prompt');
    return null;
  }
}

async function logError(error: unknown, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  try {
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert([{
        message: `${context}: ${errorMessage}`,
        stack_trace: stackTrace,
        investigated: false
      }]);

    if (insertError) {
      console.error('Failed to log error:', insertError);
    }
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}