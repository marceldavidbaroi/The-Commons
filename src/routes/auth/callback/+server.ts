import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/home';

	// The client-side Supabase client handles the PKCE auth code exchange when returning to the site,
	// or server code exchange if auth-helpers/ssr cookie exchange is configured.
	// Redirect user to the target destination.
	throw redirect(303, next);
};
