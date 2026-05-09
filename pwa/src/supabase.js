import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://vioyqhsbymxdsjzbgzhn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1SOW4-neKkb6dEB0JHBhw_iYRqEEc2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,      // La PWA sí usa localStorage del navegador
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
});
