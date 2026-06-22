import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnon) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnon);
}

export type IconRecord = {
  id: string;
  image_url: string;
  keyword1: string;
  keyword2: string;
  keyword3: string;
  theme: string;
  created_at: string;
};
