<script lang="ts">
	interface Props {
		open: boolean;
		creating?: boolean;
		onCreate: (title: string) => void;
		onClose: () => void;
	}

	let { open, creating = false, onCreate, onClose }: Props = $props();
	let title = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed || creating) return;
		onCreate(trimmed);
		title = '';
	}

	function handleClose() {
		if (creating) return;
		title = '';
		onClose();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-goal-title"
	>
		<form
			onsubmit={handleSubmit}
			class="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
		>
			<h2 id="create-goal-title" class="text-base font-semibold text-stone-900 dark:text-stone-100">
				Create Goal
			</h2>
			<div class="mt-3">
				<label for="goal-title-input" class="block text-xs font-medium text-stone-600 dark:text-stone-400">
					Goal Title
				</label>
				<input
					id="goal-title-input"
					type="text"
					bind:value={title}
					required
					placeholder="e.g., Ship The Commons v1"
					class="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
				/>
			</div>
			<div class="mt-5 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={handleClose}
					disabled={creating}
					class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!title.trim() || creating}
					class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</form>
	</div>
{/if}
