import { getSupabaseClient } from '$lib/supabase';
import type { ProfileRow } from '$lib/types/auth';
import type { TagCategory } from '$lib/types/tags';
import { DEFAULT_TAXONOMY } from '$lib/components/tag-management/constants';

/**
 * Global reactive in-memory state using Svelte 5 runes (.svelte.ts module).
 * This eliminates repeated database queries and RPC calls for profile and tags across page navigations/components.
 */
class GlobalAppState {
	// Profile state
	profile = $state<ProfileRow | null>(null);
	profileLoading = $state(false);
	private profilePromise: Promise<ProfileRow | null> | null = null;

	// Tag categories state cached per feature: { tasks: [...], homeops: [...], etc. }
	featureCategories = $state<Record<string, TagCategory[]>>({});
	private categoryPromises = new Map<string, Promise<TagCategory[]>>();
	private provisionedFeatures = new Set<string>();

	/**
	 * Get or fetch the current user profile (cached in-memory).
	 */
	async getProfile(forceRefresh = false): Promise<ProfileRow | null> {
		if (this.profile && !forceRefresh) {
			return this.profile;
		}

		if (this.profilePromise && !forceRefresh) {
			return this.profilePromise;
		}

		this.profileLoading = true;
		this.profilePromise = (async () => {
			try {
				const supabase = getSupabaseClient();
				const { data: userData } = await supabase.auth.getUser();
				if (!userData?.user) {
					this.profile = null;
					return null;
				}

				const { data, error } = await supabase
					.from('profiles')
					.select('*')
					.eq('auth_user_id', userData.user.id)
					.maybeSingle();

				if (error) {
					console.error('Error fetching user profile:', error);
					return null;
				}

				this.profile = data as ProfileRow | null;
				return this.profile;
			} finally {
				this.profileLoading = false;
				this.profilePromise = null;
			}
		})();

		return this.profilePromise;
	}

	/**
	 * Get or fetch tag categories and their tags for a specific feature (cached in-memory).
	 */
	async getFeatureTaxonomy(feature: string, forceRefresh = false): Promise<TagCategory[]> {
		if (this.featureCategories[feature] && !forceRefresh) {
			return this.featureCategories[feature];
		}

		const existingPromise = this.categoryPromises.get(feature);
		if (existingPromise && !forceRefresh) {
			return existingPromise;
		}

		const promise = (async () => {
			try {
				const profile = await this.getProfile();
				const supabase = getSupabaseClient();

				if (profile) {
					// Provision default categories only once per session/feature unless forced
					if (!this.provisionedFeatures.has(feature) || forceRefresh) {
						try {
							await supabase.rpc('provision_feature_tag_categories', {
								p_feature: feature
							});
							this.provisionedFeatures.add(feature);
						} catch (rpcErr) {
							console.warn('RPC provision_feature_tag_categories skipped:', rpcErr);
						}
					}

					const { data, error } = await supabase
						.from('tag_categories')
						.select('*, tags(*)')
						.eq('user_id', profile.id)
						.eq('feature', feature)
						.order('display_order', { ascending: true })
						.order('name', { foreignTable: 'tags', ascending: true });

					if (error) throw error;
					const cats = (data as TagCategory[]) || [];
					this.featureCategories[feature] = cats;
					return cats;
				} else {
					const featureDefaults = DEFAULT_TAXONOMY[feature] || [
						{ name: 'General', color: '#6366F1', tags: ['Default'] }
					];

					const fallback: TagCategory[] = featureDefaults.map((cat, idx) => ({
						id: idx + 1,
						slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
						feature,
						name: cat.name,
						color: cat.color,
						display_order: idx + 1,
						is_system: true,
						tags: cat.tags.map((tName, tIdx) => ({
							id: (idx + 1) * 100 + tIdx + 1,
							category_id: idx + 1,
							slug: tName.toLowerCase().replace(/\s+/g, '-'),
							name: tName,
							color: null,
							is_system: true
						}))
					}));

					this.featureCategories[feature] = fallback;
					return fallback;
				}
			} finally {
				this.categoryPromises.delete(feature);
			}
		})();

		this.categoryPromises.set(feature, promise);
		return promise;
	}

	/**
	 * Update local categories state in-place (e.g. after adding/editing/deleting a category/tag)
	 */
	setFeatureCategories(feature: string, categories: TagCategory[]) {
		this.featureCategories[feature] = categories;
	}

	/**
	 * Invalidate session cache (e.g. on logout)
	 */
	reset() {
		this.profile = null;
		this.featureCategories = {};
		this.provisionedFeatures.clear();
		this.profilePromise = null;
		this.categoryPromises.clear();
	}
}

export const appState = new GlobalAppState();
