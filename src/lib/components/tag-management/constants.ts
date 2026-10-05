export const PRESET_COLORS = [
	'#6366F1', // Indigo
	'#10B981', // Emerald
	'#0EA5E9', // Sky
	'#F59E0B', // Amber
	'#8B5CF6', // Violet
	'#EC4899', // Pink
	'#EF4444', // Red
	'#6B7280', // Slate/Gray
	'#14B8A6' // Teal
];

export const DEFAULT_TAXONOMY: Record<string, { name: string; color: string; tags: string[] }[]> = {
	tasks: [
		{
			name: 'Life Area',
			color: '#6366F1',
			tags: ['Projects', 'Chores', 'Market & Shopping', 'Personal Care', 'Finance & Bills']
		},
		{
			name: 'Effort & Pace',
			color: '#10B981',
			tags: ['Quick (<15m)', 'Deep Focus', 'Routine / Habit']
		},
		{
			name: 'Context / Location',
			color: '#0EA5E9',
			tags: ['Home', 'Work & Desk', 'Out & Errands', 'Online / Calls']
		}
	],
	goals: [
		{
			name: 'Domain',
			color: '#6366F1',
			tags: [
				'Civic & Guild',
				'Knowledge & Craft',
				'Health & Vitality',
				'Finance & Capital',
				'Home & Hearth',
				'Creative & Venture'
			]
		},
		{
			name: 'Energy & Bandwidth',
			color: '#10B981',
			tags: ['Deep Focus', 'Quick Win', 'Administrative', 'Collaborative']
		},
		{
			name: 'Impact & Leverage',
			color: '#F59E0B',
			tags: ['High Leverage', 'Foundational / Enabler', 'Maintenance']
		},
		{
			name: 'Horizon & Cycle',
			color: '#0EA5E9',
			tags: ['Immediate Focus', 'Quarterly Milestone', 'Long-term Horizon']
		},
		{
			name: 'Execution Archetype',
			color: '#8B5CF6',
			tags: ['Project Deliverable', 'Ritual & Habit', 'Research & Discovery']
		}
	],
	diary: [
		{
			name: 'Context',
			color: '#3B82F6',
			tags: ['Deep Work', 'Reflections', 'Planning']
		},
		{
			name: 'Energy Level',
			color: '#10B981',
			tags: ['High Vitality', 'Medium Vitality', 'Rest & Recovery']
		}
	],
	document: [
		{
			name: 'Department',
			color: '#8B5CF6',
			tags: ['Engineering', 'Research', 'Governance']
		},
		{
			name: 'Document Type',
			color: '#F59E0B',
			tags: ['Report', 'Charter', 'Dispatch']
		}
	]
};

export interface DeleteConfirmation {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	type: 'category' | 'tag';
	targetId: number | string;
	categoryId?: number | string;
}
