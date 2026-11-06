import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Browser client. Only used for direct image uploads. */
export const createClient = () => createBrowserClient(supabaseUrl(), supabaseAnonKey());
