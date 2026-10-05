<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { DynamicFieldDefinition, TagGroup } from '$lib/types/tags';

	let {
		activeGroup = null,
		dynamicBlueprint = [],
		metadata = $bindable({})
	} = $props<{
		activeGroup?: TagGroup | null;
		dynamicBlueprint: DynamicFieldDefinition[];
		metadata: Record<string, any>;
	}>();
</script>

{#if dynamicBlueprint.length > 0}
	<div class="dynamic-blueprint-section" transition:slide={{ duration: 240, easing: cubicOut }}>
		<div class="section-header-compact">
			<span class="section-title">
				{#if activeGroup?.icon}
					<span class="group-icon-indicator">◈</span>
				{/if}
				{activeGroup?.name || 'Category'} Attributes
			</span>
			<span class="section-hint">Dynamic fields</span>
		</div>

		<div class="dynamic-fields-grid">
			{#each dynamicBlueprint as field (field.key)}
				<div class="field-group" class:full-width={field.type === 'text' || field.type === 'multiselect'}>
					<label class="field-label" for="dyn-{field.key}">
						{field.label}
						{#if field.required}<span class="required">*</span>{/if}
						{#if field.unit}<span class="field-unit">({field.unit})</span>{/if}
					</label>

					{#if field.type === 'select'}
						<div class="select-wrapper">
							<select
								id="dyn-{field.key}"
								class="select-input"
								bind:value={metadata[field.key]}
							>
								<option value="">-- Select {field.label} --</option>
								{#each field.options || [] as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
							<span class="select-arrow">▾</span>
						</div>
					{:else if field.type === 'boolean'}
						<label class="checkbox-label" for="dyn-{field.key}">
							<input
								id="dyn-{field.key}"
								type="checkbox"
								class="checkbox-input"
								bind:checked={metadata[field.key]}
							/>
							<span>{field.description || field.label}</span>
						</label>
					{:else if field.type === 'date'}
						<input
							id="dyn-{field.key}"
							type="date"
							class="text-input"
							bind:value={metadata[field.key]}
						/>
					{:else if field.type === 'datetime'}
						<input
							id="dyn-{field.key}"
							type="datetime-local"
							class="text-input"
							bind:value={metadata[field.key]}
						/>
					{:else if field.type === 'number'}
						<input
							id="dyn-{field.key}"
							type="number"
							step="any"
							class="text-input"
							placeholder={field.placeholder || ''}
							bind:value={metadata[field.key]}
						/>
					{:else}
						<input
							id="dyn-{field.key}"
							type="text"
							class="text-input"
							placeholder={field.placeholder || ''}
							bind:value={metadata[field.key]}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.dynamic-blueprint-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.875rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.section-header-compact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.group-icon-indicator {
		font-size: 0.75rem;
		color: var(--primary);
	}

	.section-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.dynamic-fields-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.dynamic-fields-grid .full-width {
		grid-column: span 2;
	}

	@media (max-width: 480px) {
		.dynamic-fields-grid {
			grid-template-columns: 1fr;
		}

		.dynamic-fields-grid .full-width {
			grid-column: span 1;
		}
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.required {
		color: var(--danger, #ef4444);
	}

	.field-unit {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-left: 0.25rem;
	}

	.text-input,
	.select-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s ease;
		box-sizing: border-box;
	}

	.text-input:focus,
	.select-input:focus {
		border-color: var(--border-focus);
	}

	.select-wrapper {
		position: relative;
	}

	.select-input {
		appearance: none;
		padding-right: 2rem;
		cursor: pointer;
	}

	.select-arrow {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
		margin-top: 0.25rem;
	}

	.checkbox-input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--primary);
		cursor: pointer;
	}
</style>
