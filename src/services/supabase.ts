import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or local storage configuration
const STORAGE_KEY_URL = 'COLLEGE_SUPABASE_URL';
const STORAGE_KEY_KEY = 'COLLEGE_SUPABASE_ANON_KEY';

export function getStoredSupabaseConfig() {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem(STORAGE_KEY_URL);
  const localKey = localStorage.getItem(STORAGE_KEY_KEY);

  const url = localUrl || envUrl || '';
  const key = localKey || envKey || '';

  return {
    url,
    key,
    isConfigured: Boolean(url && key && url.startsWith('http'))
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url && key) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    initSupabaseClient();
  }
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      return null;
    }
  }
  supabaseInstance = null;
  return null;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    return initSupabaseClient();
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = (url && key) 
      ? createClient(url, key) 
      : getSupabase();

    if (!client) {
      return { success: false, message: 'Supabase URL and Anon Key not configured.' };
    }

    const { error: settingsError } = await client
      .from('settings')
      .select('id')
      .limit(1);

    if (settingsError) {
      const { error: storageError } = await client.storage.listBuckets();
      if (storageError && !storageError.message.includes('not found')) {
        return { success: false, message: `Storage error: ${storageError.message}` };
      }
      return { 
        success: true, 
        message: 'Connected to Supabase project! (Run SQL schema migration if tables are not yet created).' 
      };
    }

    return { success: true, message: 'Successfully connected to Supabase PostgreSQL & Cloud Storage!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed' };
  }
}
