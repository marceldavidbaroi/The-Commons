import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Client-side Supabase instance using @supabase/ssr.
 * Handles PKCE authentication flow and cookie-based persistence for Next.js.
 */
export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}


