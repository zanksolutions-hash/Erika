import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wlaypzkiokwknwioxwoq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KC7o5nOGfz4dzQrgUhc1Mg_ATbDqzYI";
export const ARTICLE_IMAGES_BUCKET = "article-images";

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
