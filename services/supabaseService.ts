
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { UserSettings, TranscriptionItem } from '../types.ts';

const getEnv = () => {
  try {
    // Check various common places for injected env variables
    const win = window as any;
    return win.process?.env || win.env || win.import?.meta?.env || {};
  } catch (e) {
    return {};
  }
};

const env = getEnv();
const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

// Export the client instance or null if credentials are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Syncs the user's profile settings to the cloud.
 */
export const syncProfile = async (userId: string, settings: UserSettings) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        user_name: settings.userName,
        voice_name: settings.voiceName,
        gender: settings.gender,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (error) console.error('Supabase Profile Sync Error:', error.message);
  } catch (err) {
    console.error('Supabase Network Error:', err);
  }
};

/**
 * Logs a segment of conversation to the database for long-term memory retrieval.
 */
export const logConversation = async (sessionId: string, items: TranscriptionItem[]) => {
  if (!supabase) return;
  try {
    const logs = items.map(item => ({
      session_id: sessionId,
      text: item.text,
      type: item.type,
      created_at: new Date().toISOString()
    }));
    
    const { error } = await supabase.from('chat_logs').insert(logs);
    if (error) console.error('Supabase Log Insert Error:', error.message);
  } catch (err) {
    console.error('Supabase Network Error (Logging):', err);
  }
};

/**
 * Retrieves recent conversation snippets to provide context to the LLM.
 */
export const getRecentMemories = async (limit = 10) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('text, type')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Supabase Memory Retrieval Error:', error.message);
      return [];
    }
    
    // Return in chronological order
    return (data || []).reverse();
  } catch (err) {
    console.error('Supabase Network Error (Retrieval):', err);
    return [];
  }
};
