import { createClient } from "@supabase/supabase-js";

// These two values come from your .env.local file (see .env.local.example),
// never hardcoded here — that way your real keys never get committed to GitHub.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local " +
    "and fill in your Project URL and anon public key from Supabase Settings → API."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
