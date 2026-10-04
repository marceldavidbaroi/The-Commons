import { getSupabaseClient } from '$lib/supabase';
import { fetchUserProfile, checkIsWhitelisted } from '$lib/services/member-service';

/**
 * Initiates Google OAuth for regular member login.
 */
export async function signInWithGoogleMember(): Promise<{ error: Error | null }> {
	const supabase = getSupabaseClient();
	const origin = typeof window !== 'undefined' ? window.location.origin : '';

	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: origin + '/auth/callback?next=' + encodeURIComponent('/home'),
			queryParams: { prompt: 'select_account' }
		}
	});

	if (error) {
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Initiates Google OAuth specifically for admin login.
 */
export async function signInWithGoogleAdmin(): Promise<{ error: Error | null }> {
	const supabase = getSupabaseClient();
	const origin = typeof window !== 'undefined' ? window.location.origin : '';

	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: origin + '/auth/callback?next=' + encodeURIComponent('/admin'),
			queryParams: { prompt: 'select_account' }
		}
	});

	if (error) {
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Signs the user out from Supabase Auth.
 */
export async function signOut(): Promise<{ error: Error | null }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.auth.signOut();

	if (error) {
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Verifies access clearance for the current session against target path.
 */
export async function verifyAccessClearance(targetPath: string): Promise<{
	authorized: boolean;
	errorReason?: 'not_whitelisted' | 'unauthorized_admin' | 'no_session';
	role?: string;
}> {
	const supabase = getSupabaseClient();
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError || !userData?.user?.email) {
		return { authorized: false, errorReason: 'no_session' };
	}

	const email = userData.user.email;
	const profile = await fetchUserProfile();
	const role = profile?.role || 'member';

	if (targetPath.startsWith('/admin')) {
		if (role === 'admin') {
			return { authorized: true, role: 'admin' };
		}
		return { authorized: false, errorReason: 'unauthorized_admin', role };
	}

	if (role === 'admin') {
		return { authorized: true, role: 'admin' };
	}

	const isWhitelisted = await checkIsWhitelisted(email);
	if (isWhitelisted) {
		return { authorized: true, role: 'member' };
	}

	return { authorized: false, errorReason: 'not_whitelisted', role };
}
