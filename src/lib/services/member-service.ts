import { getSupabaseClient } from '$lib/supabase';
import type { AllowedMemberRow, AddMemberPayload, ProfileRow } from '$lib/types/auth';

/**
 * Checks whether an email is in the allowed_members table with 'active' status.
 */
export async function checkIsWhitelisted(email: string): Promise<boolean> {
	if (!email) return false;
	const supabase = getSupabaseClient();
	const normalizedEmail = email.trim().toLowerCase();

	const { data, error } = await supabase
		.from('allowed_members')
		.select('id, status')
		.eq('email', normalizedEmail)
		.eq('status', 'active')
		.maybeSingle();

	if (error) {
		console.error('Error verifying member whitelist status:', error);
		return false;
	}

	return !!data;
}

import { appState } from '$lib/state/app.svelte';

/**
 * Fetches the user profile by numeric ID or current auth session (cached in appState).
 */
export async function fetchUserProfile(userId?: number): Promise<ProfileRow | null> {
	if (!userId) {
		return await appState.getProfile();
	}

	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.maybeSingle();

	if (error) {
		console.error('Error fetching user profile:', error);
		return null;
	}

	return data as ProfileRow | null;
}

/**
 * Lists all whitelisted members (Admin only).
 */
export async function listAllowedMembers(): Promise<{ data: AllowedMemberRow[] | null; error: Error | null }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('allowed_members')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching allowed members:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: data as AllowedMemberRow[], error: null };
}

/**
 * Adds a new member email to the whitelist (Admin only).
 */
export async function addAllowedMember(
	payload: AddMemberPayload
): Promise<{ data: AllowedMemberRow | null; error: Error | null }> {
	const supabase = getSupabaseClient();
	const email = payload.email.trim().toLowerCase();

	if (!email) {
		return { data: null, error: new Error('Email address is required') };
	}

	// Get admin profile id for added_by
	let addedBy: number | null = null;
	const profile = await fetchUserProfile();
	if (profile) {
		addedBy = profile.id;
	}

	const { data, error } = await supabase
		.from('allowed_members')
		.insert({
			email,
			status: 'active',
			notes: payload.notes?.trim() || null,
			added_by: addedBy
		})
		.select()
		.single();

	if (error) {
		console.error('Error adding allowed member:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: data as AllowedMemberRow, error: null };
}

/**
 * Revokes access or deletes a whitelisted member (Admin only).
 */
export async function revokeAllowedMember(id: number): Promise<{ error: Error | null }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase
		.from('allowed_members')
		.delete()
		.eq('id', id);

	if (error) {
		console.error('Error revoking allowed member:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}
