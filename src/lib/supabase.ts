import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Custom no-op lock to completely bypass navigator.locks acquisition warnings in hot-reload or multi-tab dev environments
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    }
  }
});
