import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GlobalsData = {
  id: number;
  game_has_started: boolean;
  checkpoint1_has_completed: boolean;
  checkpoint2_has_completed: boolean;
  checkpoint3_has_completed: boolean;
}; 