
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { UserSettings, TranscriptionItem } from '../types';

// These environment variables should be configured in your environment
const supabaseUrl = (process.env as any).SUPABASE_URL || '';
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Saves or updates the user's neural profile.
 */
export const syncProfile = async (userId: string, settings: UserSettings) => {
  if (!supabaseUrl) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      user_name: settings.userName,
      voice_name: settings.voiceName,
      gender: settings.gender,
      updated_at: new Date().toISOString()
    });
  if (error) console.error('Supabase Sync Error:', error);
};

/**
 * Persists a single chat turn (input and output) to the cloud memory.
 */
export const logConversation = async (sessionId: string, items: TranscriptionItem[]) => {
  if (!supabaseUrl) return;
  const logs = items.map(item => ({
    session_id: sessionId,
    text: item.text,
    type: item.type,
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('chat_logs')
    .insert(logs);
  
  if (error) console.error('Supabase Log Error:', error);
};

/**
 * Fetches recent memories to give the AI context of previous sessions.
 */
export const getRecentMemories = async (limit = 10) => {
  if (!supabaseUrl) return [];
  const { data, error } = await supabase
    .from('chat_logs')
    .select('text, type')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Fetch Memory Error:', error);
    return [];
  }
  return data.reverse();
};
