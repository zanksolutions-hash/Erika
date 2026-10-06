import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLE_IMAGES_BUCKET } from "./supabase-config.js";

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes("VOTRE_") &&
  !SUPABASE_ANON_KEY.includes("VOTRE_");

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export { ARTICLE_IMAGES_BUCKET };
