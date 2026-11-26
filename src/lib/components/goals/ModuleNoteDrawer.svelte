<script lang="ts">
	import type { GoalModuleWithTasks } from '$lib/types/goals';
	import RichNoteDrawer from './RichNoteDrawer.svelte';

	interface Props {
		module: GoalModuleWithTasks | null;
		onClose: () => void;
		onChange: (html: string | null) => void;
	}

	let { module, onClose, onChange }: Props = $props();
</script>

<RichNoteDrawer
	open={module !== null}
	noteKey={module ? `module-${module.id}` : null}
	kicker="Module Note"
	title={module?.title || 'Untitled Module'}
	content={module?.description ?? null}
	ariaLabel="Module Note Editor"
	{onClose}
	{onChange}
/>
