// Shared Supabase client for the whole site.
// Uses the same project as the original PakBattle Esports app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://nfupzkdebsmftwaxheag.supabase.co";
export const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdXB6a2RlYnNtZnR3YXhoZWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NDg0MjAsImV4cCI6MjEwMzIyNDQyMH0.b59ZsuSnv2Y3BK12oqZsSrDHJvfVQ5DG8Myiyt906z8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
