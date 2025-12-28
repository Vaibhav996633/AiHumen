
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { UserSettings, TranscriptionItem } from '../types.ts';

const getEnv = () => {
  try {
    return (window as any).process?.env || (window as any).env || {};
  } catch (e) {
    return {};
  }
};

const env = getEnv();
const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const syncProfile = async (userId: string, settings: UserSettings) => {
  if (!supabase) return;
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

export const logConversation = async (sessionId: string, items: TranscriptionItem[]) => {
  if (!supabase) return;
  const logs = items.map(item => ({
    session_id: sessionId,
    text: item.text,
    type: item.type,
    created_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('chat_logs').insert(logs);
  if (error) console.error('Supabase Log Error:', error);
};

export const getRecentMemories = async (limit = 10) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_logs')
    .select('text, type')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).reverse();
};
