import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Creates or gets a Supabase client configured for SvelteKit.
 */
export function getSupabaseClient() {
	return createBrowserClient(
		PUBLIC_SUPABASE_URL || '',
		PUBLIC_SUPABASE_ANON_KEY || ''
	);
}
