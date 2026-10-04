import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '$lib/types/database.types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Creates or gets a Supabase client configured with auto-generated Database types.
 */
export function getSupabaseClient() {
	return createBrowserClient<Database>(
		PUBLIC_SUPABASE_URL || '',
		PUBLIC_SUPABASE_ANON_KEY || ''
	);
}

