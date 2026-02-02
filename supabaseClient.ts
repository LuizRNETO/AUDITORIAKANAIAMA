import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Provide fallback values to prevent "supabaseUrl is required" error during initialization
// if environment variables are not set. Database operations will fail gracefully.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or Key missing. Database features will not work.");
}