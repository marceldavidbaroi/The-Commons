<script lang="ts">
	import { onMount } from 'svelte';

	let {
		value = $bindable(''),
		label = 'Date',
		placeholder = 'Select date...',
		onchange
	} = $props<{
		value?: string;
		label?: string;
		placeholder?: string;
		onchange?: (val: string) => void;
	}>();

	let isOpen = $state(false);
	let pickerContainer: HTMLElement | null = null;

	// View calendar navigation state
	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth()); // 0-indexed

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	$effect(() => {
		if (value) {
			const parts = value.split('-');
			if (parts.length === 3) {
				const y = parseInt(parts[0], 10);
				const m = parseInt(parts[1], 10) - 1;
				if (!isNaN(y) && !isNaN(m)) {
					viewYear = y;
					viewMonth = m;
				}
			}
		}
	});

	function formatDisplayDate(dateStr: string): string {
		if (!dateStr) return '';
		const parts = dateStr.split('-');
		if (parts.length !== 3) return dateStr;
		const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
		
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.getTime() === today.getTime()) return 'Today';
		if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
		if (date.getTime() === yesterday.getTime()) return 'Yesterday';

		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
	}

	function selectDate(dateStr: string) {
		value = dateStr;
		isOpen = false;
		if (onchange) onchange(dateStr);
	}

	function clearDate() {
		value = '';
		isOpen = false;
		if (onchange) onchange('');
	}

	function setQuick(type: 'today' | 'tomorrow' | 'nextWeek') {
		const d = new Date();
		if (type === 'tomorrow') d.setDate(d.getDate() + 1);
		else if (type === 'nextWeek') d.setDate(d.getDate() + 7);
		
		const str = d.toISOString().split('T')[0];
		selectDate(str);
	}

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear -= 1;
		} else {
			viewMonth -= 1;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear += 1;
		} else {
			viewMonth += 1;
		}
	}

	// Calendar calculation
	const calendarDays = $derived.by(() => {
		const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
		const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

		const days: Array<{
			dayNumber: number;
			dateStr: string;
			isCurrentMonth: boolean;
			isToday: boolean;
			isSelected: boolean;
		}> = [];

		const todayStr = new Date().toISOString().split('T')[0];

		// Prev month filler
		for (let i = firstDayIndex - 1; i >= 0; i--) {
			const dayNum = daysInPrevMonth - i;
			const m = viewMonth === 0 ? 12 : viewMonth;
			const y = viewMonth === 0 ? viewYear - 1 : viewYear;
			const str = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
			days.push({
				dayNumber: dayNum,
				dateStr: str,
				isCurrentMonth: false,
				isToday: str === todayStr,
				isSelected: str === value
			});
		}

		// Current month days
		for (let i = 1; i <= daysInCurrentMonth; i++) {
			const str = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
			days.push({
				dayNumber: i,
				dateStr: str,
				isCurrentMonth: true,
				isToday: str === todayStr,
				isSelected: str === value
			});
		}

		// Next month filler to complete 42 cells grid (6 rows)
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const m = viewMonth === 11 ? 1 : viewMonth + 2;
			const y = viewMonth === 11 ? viewYear + 1 : viewYear;
			const str = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
			days.push({
				dayNumber: i,
				dateStr: str,
				isCurrentMonth: false,
				isToday: str === todayStr,
				isSelected: str === value
			});
		}

		return days;
	});

	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (isOpen && pickerContainer && !pickerContainer.contains(e.target as Node)) {
				isOpen = false;
			}
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape' && isOpen) {
				isOpen = false;
			}
		}

		window.addEventListener('click', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('click', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div class="date-picker-wrapper" bind:this={pickerContainer}>
	<!-- Flat Trigger Button -->
	<button
		type="button"
		class="date-trigger"
		class:active={isOpen}
		class:has-value={!!value}
		onclick={() => (isOpen = !isOpen)}
		aria-haspopup="dialog"
		aria-expanded={isOpen}
		aria-label={`${label}: ${value ? formatDisplayDate(value) : placeholder}`}
	>
		<svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
		<span class="date-text">{value ? formatDisplayDate(value) : placeholder}</span>
	</button>

	<!-- Calendar Dropdown Popover -->
	{#if isOpen}
		<div class="calendar-popover" role="dialog" aria-modal="false">
			<!-- Quick Presets -->
			<div class="quick-presets">
				<button type="button" class="preset-pill" onclick={() => setQuick('today')}>Today</button>
				<button type="button" class="preset-pill" onclick={() => setQuick('tomorrow')}>Tomorrow</button>
				<button type="button" class="preset-pill" onclick={() => setQuick('nextWeek')}>+1 Week</button>
				{#if value}
					<button type="button" class="preset-pill clear-pill" onclick={clearDate}>Clear</button>
				{/if}
			</div>

			<div class="divider"></div>

			<!-- Month Navigation -->
			<div class="month-nav">
				<button type="button" class="nav-arrow-btn" onclick={prevMonth} aria-label="Previous month">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6" />
					</svg>
				</button>
				<span class="month-title">{monthNames[viewMonth]} {viewYear}</span>
				<button type="button" class="nav-arrow-btn" onclick={nextMonth} aria-label="Next month">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</button>
			</div>

			<!-- Weekday Headers -->
			<div class="weekday-grid">
				{#each dayHeaders as header}
					<span class="weekday-cell">{header}</span>
				{/each}
			</div>

			<!-- Calendar Grid -->
			<div class="days-grid">
				{#each calendarDays as day}
					<button
						type="button"
						class="day-btn"
						class:other-month={!day.isCurrentMonth}
						class:today={day.isToday}
						class:selected={day.isSelected}
						onclick={() => selectDate(day.dateStr)}
					>
						{day.dayNumber}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.date-picker-wrapper {
		position: relative;
		display: inline-flex;
	}

	.date-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: transparent;
		border: none;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.date-trigger:hover,
	.date-trigger.active {
		color: var(--text-primary);
		background-color: var(--bg-tertiary);
	}

	.date-trigger.has-value {
		color: var(--primary);
		font-weight: 600;
	}

	.date-icon {
		width: 13px;
		height: 13px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.date-trigger.has-value .date-icon {
		color: var(--primary);
	}

	/* Calendar Popover */
	.calendar-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		width: 250px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
		padding: 0.75rem;
		z-index: 120;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: popoverFade 0.12s ease-out;
	}

	@keyframes popoverFade {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Quick Presets */
	.quick-presets {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.preset-pill {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.preset-pill:hover {
		background-color: var(--bg-surface);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.preset-pill.clear-pill {
		color: var(--danger);
		background-color: transparent;
		border-color: transparent;
		margin-left: auto;
	}

	.preset-pill.clear-pill:hover {
		background-color: #fee2e2;
	}

	.divider {
		height: 1px;
		background-color: var(--border-subtle);
		margin: 0.125rem 0;
	}

	/* Month Nav */
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.nav-arrow-btn {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		padding: 0;
		transition: all 0.12s ease;
	}

	.nav-arrow-btn:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.nav-arrow-btn svg {
		width: 13px;
		height: 13px;
	}

	/* Weekday Grid */
	.weekday-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		gap: 2px;
	}

	.weekday-cell {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		padding: 0.125rem 0;
	}

	/* Days Grid */
	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.day-btn {
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		padding: 0;
		transition: all 0.1s ease;
	}

	.day-btn:hover {
		background-color: var(--bg-tertiary);
	}

	.day-btn.other-month {
		color: var(--text-muted);
		opacity: 0.45;
	}

	.day-btn.today {
		font-weight: 700;
		border: 1px solid var(--border-focus);
	}

	.day-btn.selected {
		background-color: var(--primary);
		color: var(--primary-foreground);
		font-weight: 700;
	}
</style>
