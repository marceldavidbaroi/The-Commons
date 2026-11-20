<script lang="ts">
	interface Props {
		open: boolean;
		saving?: boolean;
		onSaveAndLeave: () => void;
		onDiscard: () => void;
		onCancel: () => void;
	}

	let { open, saving = false, onSaveAndLeave, onDiscard, onCancel }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="unsaved-dialog-title"
	>
		<div class="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900">
			<h2 id="unsaved-dialog-title" class="text-base font-semibold text-stone-900 dark:text-stone-100">
				Unsaved Changes
			</h2>
			<p class="mt-2 text-sm text-stone-600 dark:text-stone-400">
				You have unsaved edits on this page. Would you like to save them before leaving?
			</p>
			<div class="mt-5 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={onCancel}
					disabled={saving}
					class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={onDiscard}
					disabled={saving}
					class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
				>
					Discard
				</button>
				<button
					type="button"
					onclick={onSaveAndLeave}
					disabled={saving}
					class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{saving ? 'Saving...' : 'Save & Leave'}
				</button>
			</div>
		</div>
	</div>
{/if}
