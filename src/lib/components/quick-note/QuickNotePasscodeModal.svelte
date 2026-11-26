<script lang="ts">
	import {
		setQuickNotePasscode,
		verifyQuickNotePasscode
	} from '$lib/services/quick-note-service';

	interface Props {
		open: boolean;
		mode: 'set' | 'verify';
		title?: string;
		onCancel: () => void;
		onSuccess: () => void;
	}

	let { open, mode, title, onCancel, onSuccess }: Props = $props();

	let passcode = $state('');
	let confirmPasscode = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	$effect(() => {
		if (open) {
			passcode = '';
			confirmPasscode = '';
			error = null;
			submitting = false;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		if (passcode.trim().length < 4) {
			error = 'Passcode must be at least 4 characters.';
			return;
		}

		if (mode === 'set' && passcode !== confirmPasscode) {
			error = 'Passcodes do not match.';
			return;
		}

		submitting = true;
		try {
			if (mode === 'set') {
				await setQuickNotePasscode(passcode);
				onSuccess();
			} else {
				const ok = await verifyQuickNotePasscode(passcode);
				if (!ok) {
					error = 'Incorrect passcode.';
					return;
				}
				onSuccess();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to process passcode.';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div
		class="qn-modal-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={onCancel}
		onkeydown={(e) => e.key === 'Escape' && onCancel()}
	>
		<div class="qn-modal" onclick={(e) => e.stopPropagation()}>
			<h2 class="qn-modal-title">
				{title ?? (mode === 'set' ? 'Set Lock Passcode' : 'Enter Passcode')}
			</h2>
			<p class="qn-modal-subtitle">
				{mode === 'set'
					? 'Create a passcode to lock and unlock your Quick Notes.'
					: 'Enter your Quick Note passcode to continue.'}
			</p>

			<form onsubmit={handleSubmit} class="qn-modal-form">
				<input
					type="password"
					class="qn-modal-input"
					placeholder="Passcode"
					bind:value={passcode}
					autocomplete={mode === 'set' ? 'new-password' : 'current-password'}
				/>

				{#if mode === 'set'}
					<input
						type="password"
						class="qn-modal-input"
						placeholder="Confirm passcode"
						bind:value={confirmPasscode}
						autocomplete="new-password"
					/>
				{/if}

				{#if error}
					<div class="qn-modal-error">{error}</div>
				{/if}

				<div class="qn-modal-actions">
					<button type="button" class="qn-btn-secondary" onclick={onCancel} disabled={submitting}>
						Cancel
					</button>
					<button type="submit" class="qn-btn-primary" disabled={submitting}>
						{submitting ? 'Checking...' : mode === 'set' ? 'Set Passcode' : 'Unlock'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.qn-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1200;
		background-color: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.qn-modal {
		width: 100%;
		max-width: 360px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0.625rem;
		padding: 1.25rem;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
	}

	.qn-modal-title {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.qn-modal-subtitle {
		margin: 0 0 1rem;
		font-size: 0.825rem;
		color: var(--text-secondary);
	}

	.qn-modal-form {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.qn-modal-input {
		width: 100%;
		padding: 0.5rem 0.65rem;
		font-size: 0.875rem;
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.qn-modal-error {
		font-size: 0.8rem;
		color: #ef4444;
	}

	.qn-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.qn-btn-secondary {
		padding: 0.45rem 0.85rem;
		font-size: 0.825rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.qn-btn-primary {
		padding: 0.45rem 0.85rem;
		font-size: 0.825rem;
		font-weight: 600;
		border: none;
		background-color: var(--primary, #9E5A3C);
		color: var(--primary-foreground, #fff);
		border-radius: 0.375rem;
		cursor: pointer;
	}
</style>
