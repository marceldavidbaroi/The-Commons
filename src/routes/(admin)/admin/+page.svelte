<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchUserProfile, listAllowedMembers, addAllowedMember, revokeAllowedMember } from '$lib/services/member-service';
	import type { AllowedMemberRow } from '$lib/types/auth';

	let isLoading = $state(true);
	let members = $state<AllowedMemberRow[]>([]);
	let searchQuery = $state('');
	let isSubmitting = $state(false);
	let newEmail = $state('');
	let newNotes = $state('');
	let showAddModal = $state(false);
	let actionError = $state<string | null>(null);
	let actionSuccess = $state<string | null>(null);

	// Load member whitelist
	async function loadMembers() {
		isLoading = true;
		actionError = null;
		try {
			const profile = await fetchUserProfile();
			if (!profile || profile.role !== 'admin') {
				window.location.href = '/admin/login?error=unauthorized_admin';
				return;
			}

			const { data, error } = await listAllowedMembers();
			if (error) {
				actionError = error.message;
			} else {
				members = data || [];
			}
		} catch (err: any) {
			actionError = err?.message || 'Failed to load member directory';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadMembers();
	});

	// Filtered member list
	const filteredMembers = $derived(
		members.filter((m) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return m.email.toLowerCase().includes(q) || (m.notes && m.notes.toLowerCase().includes(q));
		})
	);

	async function handleAddMember(e: SubmitEvent) {
		e.preventDefault();
		if (!newEmail.trim()) return;

		isSubmitting = true;
		actionError = null;
		actionSuccess = null;

		try {
			const { data, error } = await addAllowedMember({
				email: newEmail.trim().toLowerCase(),
				notes: newNotes.trim() || undefined
			});

			if (error) {
				actionError = error.message;
			} else if (data) {
				members = [data, ...members];
				newEmail = '';
				newNotes = '';
				showAddModal = false;
				actionSuccess = 'Member successfully whitelisted.';
				setTimeout(() => {
					actionSuccess = null;
				}, 4000);
			}
		} catch (err: any) {
			actionError = err?.message || 'Failed to add member';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRevoke(member: AllowedMemberRow) {
		const confirmed = window.confirm(`Revoke access for ${member.email}? They will no longer be able to log in.`);
		if (!confirmed) return;

		try {
			const { error } = await revokeAllowedMember(member.id);
			if (error) {
				actionError = error.message;
			} else {
				members = members.filter((m) => m.id !== member.id);
				actionSuccess = `Revoked access for ${member.email}`;
				setTimeout(() => {
					actionSuccess = null;
				}, 4000);
			}
		} catch (err: any) {
			actionError = err?.message || 'Failed to revoke member';
		}
	}

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Whitelist Management</title>
</svelte:head>

<div class="admin-dashboard">
	<!-- Top Row: Title + Stats & Primary CTA -->
	<div class="dashboard-topbar">
		<div class="title-block">
			<div class="title-row">
				<h1 class="page-title">Member Whitelist</h1>
				<span class="count-badge">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
			</div>
			<p class="page-subtitle">Only approved Gmail accounts on this registry can sign into The Commons.</p>
		</div>

		<div class="action-row">
			<button type="button" class="btn-primary" onclick={() => (showAddModal = true)}>
				<svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
					<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
				</svg>
				<span>Add Member</span>
			</button>
		</div>
	</div>

	<!-- Status Banners -->
	{#if actionError}
		<div class="alert-banner error" role="alert">
			<span>{actionError}</span>
			<button type="button" class="alert-close" onclick={() => (actionError = null)}>×</button>
		</div>
	{/if}

	{#if actionSuccess}
		<div class="alert-banner success" role="status">
			<span>{actionSuccess}</span>
			<button type="button" class="alert-close" onclick={() => (actionSuccess = null)}>×</button>
		</div>
	{/if}

	<!-- Filter / Search Toolbar -->
	<div class="search-toolbar">
		<div class="search-input-wrapper">
			<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
				<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
			</svg>
			<input
				type="text"
				class="search-input"
				placeholder="Search by Gmail or note..."
				bind:value={searchQuery}
			/>
			{#if searchQuery}
				<button type="button" class="search-clear" onclick={() => (searchQuery = '')}>×</button>
			{/if}
		</div>
	</div>

	<!-- Member List Canvas -->
	<div class="members-table-card">
		{#if isLoading}
			<div class="state-container">
				<div class="spinner"></div>
				<span class="state-text">Loading whitelist registry...</span>
			</div>
		{:else if filteredMembers.length === 0}
			<div class="state-container empty">
				<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
					<path d="M16 3.13a4 4 0 0 1 0 7.75" />
				</svg>
				<p class="empty-title">{searchQuery ? 'No matching members found' : 'No members whitelisted yet'}</p>
				<p class="empty-desc">
					{searchQuery ? 'Try adjusting your search keywords.' : 'Add your first member email above to grant platform access.'}
				</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table class="members-table">
					<thead>
						<tr>
							<th class="col-email">Gmail Address</th>
							<th class="col-status">Status</th>
							<th class="col-notes">Notes</th>
							<th class="col-date">Added</th>
							<th class="col-actions">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMembers as member (member.id)}
							<tr class="member-row">
								<td class="col-email">
									<div class="email-cell">
										<span class="email-text">{member.email}</span>
									</div>
								</td>
								<td class="col-status">
									<span class="status-pill active">{member.status}</span>
								</td>
								<td class="col-notes">
									<span class="notes-text" title={member.notes || ''}>
										{member.notes || '—'}
									</span>
								</td>
								<td class="col-date">
									<span class="date-text">{formatDate(member.created_at)}</span>
								</td>
								<td class="col-actions">
									<button
										type="button"
										class="btn-action-revoke"
										title="Revoke access"
										onclick={() => handleRevoke(member)}
									>
										Revoke
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Modal: Add Whitelisted Member -->
{#if showAddModal}
	<div class="modal-backdrop" onclick={() => (showAddModal = false)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2 class="modal-title">Add Member to Whitelist</h2>
				<button type="button" class="modal-close-btn" onclick={() => (showAddModal = false)}>×</button>
			</div>

			<form onsubmit={handleAddMember} class="modal-form">
				<div class="form-group">
					<label for="member-email" class="field-label">Gmail Address <span class="req">*</span></label>
					<input
						id="member-email"
						type="email"
						class="form-input"
						placeholder="e.g. member@gmail.com"
						bind:value={newEmail}
						required
						autocomplete="off"
					/>
					<p class="field-hint">Must match the Google account the member will sign in with.</p>
				</div>

				<div class="form-group">
					<label for="member-notes" class="field-label">Administrative Notes (Optional)</label>
					<input
						id="member-notes"
						type="text"
						class="form-input"
						placeholder="e.g. Team Lead, Engineering, Beta tester..."
						bind:value={newNotes}
					/>
				</div>

				<div class="modal-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={() => (showAddModal = false)}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button type="submit" class="btn-primary" disabled={isSubmitting || !newEmail.trim()}>
						{isSubmitting ? 'Adding...' : 'Add Member'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.admin-dashboard {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
	}

	/* Top Bar */
	.dashboard-topbar {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.title-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		margin: 0;
	}

	.count-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-secondary);
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-full);
		padding: 0.125rem 0.5rem;
	}

	.page-subtitle {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
	}

	/* Buttons */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background-color: var(--primary);
		color: #ffffff;
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.4375rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s ease;
		white-space: nowrap;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.4375rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--bg-tertiary);
	}

	/* Search Bar */
	.search-toolbar {
		display: flex;
		align-items: center;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		max-width: 340px;
	}

	.search-icon {
		position: absolute;
		left: 0.625rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.375rem 1.75rem 0.375rem 2rem;
		font-size: 0.8125rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--primary);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0;
	}

	/* Table Card */
	.members-table-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.table-wrapper {
		width: 100%;
		overflow-x: auto;
	}

	.members-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.8125rem;
	}

	.members-table th {
		padding: 0.625rem 0.875rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-tertiary);
	}

	.member-row {
		border-bottom: 1px solid var(--border-subtle);
		transition: background-color 0.12s ease;
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-row:hover {
		background-color: var(--bg-tertiary);
	}

	.member-row td {
		padding: 0.625rem 0.875rem;
		color: var(--text-primary);
		vertical-align: middle;
	}

	.col-email {
		font-weight: 500;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.4375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		border-radius: var(--radius-full);
	}

	.status-pill.active {
		background-color: rgba(34, 197, 94, 0.12);
		color: #16a34a;
		border: 1px solid rgba(34, 197, 94, 0.25);
	}

	.notes-text {
		color: var(--text-secondary);
		max-width: 200px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.date-text {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.btn-action-revoke {
		background: transparent;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.2rem 0.4375rem;
		font-size: 0.6875rem;
		color: var(--danger);
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.btn-action-revoke:hover {
		background-color: #fee2e2;
		border-color: #fca5a5;
	}

	/* Alerts */
	.alert-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
	}

	.alert-banner.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: #ef4444;
	}

	.alert-banner.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.25);
		color: #16a34a;
	}

	.alert-close {
		background: none;
		border: none;
		color: currentColor;
		font-size: 1rem;
		cursor: pointer;
		line-height: 1;
	}

	/* Empty & Loading States */
	.state-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		gap: 0.625rem;
		color: var(--text-secondary);
	}

	.state-container.empty {
		text-align: center;
	}

	.empty-icon {
		width: 32px;
		height: 32px;
		color: var(--text-muted);
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.spinner {
		width: 22px;
		height: 22px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Modal Backdrop & Card */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		width: 100%;
		max-width: 440px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.125rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.modal-close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.25rem;
		cursor: pointer;
		line-height: 1;
	}

	.modal-form {
		padding: 1.125rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.field-label .req {
		color: #ef4444;
	}

	.field-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.form-input {
		padding: 0.5rem 0.625rem;
		font-size: 0.8125rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		border-color: var(--primary);
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.625rem;
		margin-top: 0.5rem;
	}

	@media (max-width: 640px) {
		.dashboard-topbar {
			flex-direction: column;
			align-items: stretch;
		}

		.action-row {
			width: 100%;
		}

		.btn-primary {
			width: 100%;
			justify-content: center;
		}

		.search-input-wrapper {
			max-width: 100%;
		}

		.col-notes,
		.col-date {
			display: none;
		}
	}
</style>
