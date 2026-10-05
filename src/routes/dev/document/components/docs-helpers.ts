export function getBadgeClass(badge: string): string {
	switch (badge) {
		case 'Spec':
			return 'badge-spec';
		case 'PRD':
			return 'badge-prd';
		case 'TDD':
			return 'badge-tdd';
		case 'Schema':
			return 'badge-schema';
		case 'API Contract':
			return 'badge-api';
		case 'Matrix':
			return 'badge-matrix';
		case 'Architecture':
			return 'badge-arch';
		case 'Code Stub':
			return 'badge-stub';
		default:
			return 'badge-default';
	}
}

// Map feature folder names to exact database tables
export function getFeatureTableNames(featureName?: string): string[] {
	if (!featureName) return [];
	const lower = featureName.toLowerCase();
	if (lower.includes('task')) return ['tasks'];
	if (lower.includes('goal')) return ['goals'];
	if (lower.includes('diary') || lower.includes('journal')) return ['diaries', 'diary_entries'];
	if (lower.includes('tag')) return ['tags', 'tag_categories'];
	if (lower.includes('auth') || lower.includes('access')) return ['allowed_members', 'profiles'];
	if (lower.includes('passport') || lower.includes('profile')) return ['profiles'];
	if (lower.includes('homeops') || lower.includes('inventory')) return ['user_items'];
	return [];
}

// Map feature folder names to exact route paths
export function getFeatureRoutePaths(featureName?: string): string[] {
	if (!featureName) return [];
	const lower = featureName.toLowerCase();
	if (lower.includes('task')) return ['/tasks'];
	if (lower.includes('goal')) return ['/goals'];
	if (lower.includes('diary') || lower.includes('journal')) return ['/diary', '/diary/[id]'];
	if (lower.includes('auth') || lower.includes('access')) return ['/login', '/auth/callback', '/admin', '/admin/login'];
	if (lower.includes('passport') || lower.includes('profile')) return ['/profile'];
	if (lower.includes('homeops') || lower.includes('inventory')) return ['/homeops'];
	if (lower.includes('tag')) return [];
	return [];
}

export function getFeatureComponentNames(featureName?: string): string[] {
	if (!featureName) return [];
	const lower = featureName.toLowerCase();
	if (lower.includes('tag')) return ['TagManagementSidePanel.svelte', 'TagPicker.svelte'];
	if (lower.includes('task')) return ['TaskSidePanel.svelte', 'TagManagementSidePanel.svelte'];
	return [];
}
