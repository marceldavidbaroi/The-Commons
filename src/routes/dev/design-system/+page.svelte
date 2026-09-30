<script lang="ts">
	import CommonsLogo from '$lib/components/brand/CommonsLogo.svelte';
	import CommonsSealVector from '$lib/components/brand/CommonsSealVector.svelte';

	interface ColorSwatch {
		name: string;
		role: string;
		hex: string;
		rgb: string;
		textColor: string;
		description: string;
		usage: string[];
	}

	const baseColorTokens: ColorSwatch[] = [
		{
			name: 'Ocean Slate',
			role: 'Primary Brand',
			hex: '#3368A0',
			rgb: 'rgb(51, 104, 160)',
			textColor: '#ffffff',
			description: 'Deep oceanic blue serving as the core anchor for key actions, brand identity, navigation, and primary interactive elements.',
			usage: ['Primary CTA Buttons', 'Active Tabs', 'Brand Identity', 'Key Action Rings']
		},
		{
			name: 'Muted Cerulean',
			role: 'Secondary Brand',
			hex: '#66A3BF',
			rgb: 'rgb(102, 163, 191)',
			textColor: '#ffffff',
			description: 'Soft azure accent offering breathing room, supporting secondary interactions, badges, and progress indicators.',
			usage: ['Secondary Badges', 'Hover States', 'Progress Indicators', 'Supporting Accents']
		},
		{
			name: 'Seafoam Mist',
			role: 'Accent Tint',
			hex: '#C8DFDB',
			rgb: 'rgb(200, 223, 219)',
			textColor: '#193836',
			description: 'Serene, organic seafoam for subtle card backgrounds, badge fills, selection highlights, and soft borders.',
			usage: ['Selection Highlights', 'Soft Badges', 'Accent Backgrounds', 'Subtle Dividers']
		},
		{
			name: 'Linen Warm White',
			role: 'Surface / Canvas',
			hex: '#F2EFE7',
			rgb: 'rgb(242, 239, 231)',
			textColor: '#2D3748',
			description: 'Calm, natural bone surface tone establishing a warm Scandinavian atmosphere.',
			usage: ['App Canvas', 'Muted Surfaces', 'Subtle Containers', 'Sidebar Fill']
		},
		{
			name: 'Dark Brand Navy',
			role: 'Dark Canvas',
			hex: '#1E2D3D',
			rgb: 'rgb(30, 45, 61)',
			textColor: '#ffffff',
			description: 'Deep oceanic dark tone for dark mode backgrounds, high contrast elements, and solid dark surfaces.',
			usage: ['Dark Mode Background', 'Solid Dark Fills', 'Contrast Typography']
		}
	];

	const diaryColorTokens: ColorSwatch[] = [
		{
			name: 'Walnut Ink',
			role: 'Primary Typography',
			hex: '#2C241E',
			rgb: 'rgb(44, 36, 30)',
			textColor: '#FAF4EB',
			description: 'Warm, rich dark-brown organic walnut ink tone for timeless handwriting, headings, and folios.',
			usage: ['Handwritten Titles', 'Journal Body Text', 'Folio Inscriptions', 'Primary Contrast']
		},
		{
			name: 'Antique Parchment',
			role: 'Paper Canvas',
			hex: '#F4EAD4',
			rgb: 'rgb(244, 234, 212)',
			textColor: '#2C241E',
			description: 'Warm, tea-stained aged manuscript parchment with subtle oxidation gradients and fiber texture.',
			usage: ['Journal Sheet Canvas', 'Ledger Background', 'Torn Scrap Chips', 'Deckled Sheets']
		},
		{
			name: 'Terracotta Wax Seal',
			role: 'Seal & Primary Action',
			hex: '#8C3A27',
			rgb: 'rgb(140, 58, 39)',
			textColor: '#FFFFFF',
			description: 'Deep oxidized Venetian red inspired by embossed wax signet seals.',
			usage: ['Wax Seal Buttons', 'Primary Inscribe CTA', 'Important Badges', 'Signet Accents']
		},
		{
			name: 'Worn Leather',
			role: 'Cover & Borders',
			hex: '#4A3728',
			rgb: 'rgb(74, 55, 40)',
			textColor: '#FAF4EB',
			description: 'Rugged vintage hide tone for journal spines, stitched seams, and framed enclosures.',
			usage: ['Journal Spine / Edge', 'Embossed Containers', 'Card Borders', 'Metadata Headers']
		}
	];

	let copiedHex = $state<string | null>(null);
	let activeTab = $state<'paradigms' | 'components' | 'brand' | 'colors' | 'diary'>('components');

	// Interactive demo state for List Components
	let demoTasks = $state([
		{ id: '1', title: 'Initialize SvelteKit tasks schema & migrations', completed: true, priority: 'High', due: 'Today', tag: 'DB' },
		{ id: '2', title: 'Design compact flat list UI primitive', completed: false, priority: 'Critical', due: '14:00', tag: 'Design' },
		{ id: '3', title: 'Connect reactive store & instant toggle', completed: false, priority: 'Normal', due: 'Tomorrow', tag: 'Core' },
		{ id: '4', title: 'Audit split master-detail drawer ergonomics', completed: false, priority: 'Gentle', due: 'Oct 02', tag: 'Audit' }
	]);
	let listFilterTab = $state<'all' | 'active' | 'completed'>('all');
	let listSearchQuery = $state('');

	function toggleDemoTask(id: string) {
		demoTasks = demoTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
	}

	let filteredDemoTasks = $derived(
		demoTasks.filter(t => {
			if (listFilterTab === 'active' && t.completed) return false;
			if (listFilterTab === 'completed' && !t.completed) return false;
			if (listSearchQuery.trim() && !t.title.toLowerCase().includes(listSearchQuery.toLowerCase())) return false;
			return true;
		})
	);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copiedHex = text;
		setTimeout(() => (copiedHex = null), 2000);
	}
</script>

<svelte:head>
	<title>Design System & Brand Assets | The Commons</title>
</svelte:head>

<div class="ds-container">
	<header class="ds-header">
		<div class="header-inner">
			<div class="header-left">
				<CommonsLogo size="sm" showFolio={true} />
				<span class="ds-badge">Design System & Brand Spec</span>
			</div>
			<div class="header-right">
				<a href="/dev/document" class="nav-link">← Codex Specs</a>
				<a href="/app" class="nav-link">Sanctuary App →</a>
			</div>
		</div>
	</header>

	<main class="ds-body">
		<!-- Sub-navigation Tabs -->
		<nav class="tab-nav" aria-label="Design System Sections">
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'components'}
				onclick={() => (activeTab = 'components')}
			>
				<span class="tab-indicator"></span>
				<span class="tab-title">Components</span>
				<span class="tab-badge">List, Cards & Inputs</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'paradigms'}
				onclick={() => (activeTab = 'paradigms')}
			>
				<span class="tab-indicator"></span>
				<span class="tab-title">Layout Paradigms</span>
				<span class="tab-badge">Where & Why</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'brand'}
				onclick={() => (activeTab = 'brand')}
			>
				<span class="tab-indicator"></span>
				<span class="tab-title">Brand & Seals</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'colors'}
				onclick={() => (activeTab = 'colors')}
			>
				<span class="tab-indicator"></span>
				<span class="tab-title">Core Colors</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'diary'}
				onclick={() => (activeTab = 'diary')}
			>
				<span class="tab-indicator"></span>
				<span class="tab-title">Diary Palette</span>
			</button>
		</nav>

		<!-- TAB: Components (Compact List, Filters, Item States) -->
		{#if activeTab === 'components'}
			<div class="tab-content-fade">
				<section class="ds-section">
					<div class="section-heading">
						<h2 class="section-title">Compact List & Ledger Components</h2>
						<p class="section-desc">
							High-density, accessible flat list primitives engineered for task management, journals, ledger logs, and master-detail split views. Built for max visual scannability (10–15 items above fold).
						</p>
					</div>

					<!-- Live Interactive Component Showcase -->
					<div class="component-demo-card">
						<div class="demo-card-header">
							<div>
								<h3 class="demo-title">Interactive Task List & Inline Filter Bar</h3>
								<p class="demo-subtitle">Single-row toolbar merged with high-density compact flat list.</p>
							</div>
							<span class="demo-badge">Svelte 5 Reactive</span>
						</div>

						<!-- Tier 2: Inline Filter Toolbar -->
						<div class="demo-toolbar">
							<div class="demo-search-wrap">
								<svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="11" cy="11" r="8"></circle>
									<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
								</svg>
								<input
									type="text"
									placeholder="Filter tasks..."
									bind:value={listSearchQuery}
									class="demo-search-input"
								/>
							</div>

							<div class="demo-filter-pills">
								<button
									type="button"
									class="filter-pill"
									class:active={listFilterTab === 'all'}
									onclick={() => (listFilterTab = 'all')}
								>
									All <span class="pill-count">{demoTasks.length}</span>
								</button>
								<button
									type="button"
									class="filter-pill"
									class:active={listFilterTab === 'active'}
									onclick={() => (listFilterTab = 'active')}
								>
									Active <span class="pill-count">{demoTasks.filter(t => !t.completed).length}</span>
								</button>
								<button
									type="button"
									class="filter-pill"
									class:active={listFilterTab === 'completed'}
									onclick={() => (listFilterTab = 'completed')}
								>
									Completed <span class="pill-count">{demoTasks.filter(t => t.completed).length}</span>
								</button>
							</div>

							<div class="demo-count-tally">
								Showing {filteredDemoTasks.length} of {demoTasks.length} tasks
							</div>
						</div>

						<!-- Compact Flat List Container -->
						<div class="compact-list-container">
							{#if filteredDemoTasks.length > 0}
								{#each filteredDemoTasks as task (task.id)}
									<div
										role="button"
										tabindex="0"
										onclick={() => toggleDemoTask(task.id)}
										onkeydown={(e) => e.key === 'Enter' && toggleDemoTask(task.id)}
										class="compact-list-row"
										class:completed={task.completed}
									>
										<!-- Prefix: Checkbox -->
										<div class="row-prefix">
											<div class="custom-checkbox" class:checked={task.completed}>
												{#if task.completed}
													<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
														<polyline points="20 6 9 17 4 12"></polyline>
													</svg>
												{/if}
											</div>
										</div>

										<!-- Content: Title & Tag -->
										<div class="row-content">
											<span class="row-text" class:strike={task.completed}>
												{task.title}
											</span>
										</div>

										<!-- Suffix: Tag & Due Date -->
										<div class="row-suffix">
											<span class="row-tag">{task.tag}</span>
											<span class="row-priority" class:high={task.priority === 'High' || task.priority === 'Critical'}>
												{task.priority}
											</span>
											<span class="row-due">{task.due}</span>
										</div>
									</div>
								{/each}
							{:else}
								<div class="list-empty-state">
									<p class="empty-title">No matching tasks</p>
									<p class="empty-subtitle">Try adjusting your search query or active filter.</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Comparison Matrix: List Variants Grid -->
					<div class="list-variants-grid">
						<!-- Variant 1: Compact (Tasks & Ledgers) -->
						<div class="variant-preview-card">
							<div class="variant-card-header">
								<div>
									<h4 class="variant-name">1. Compact Flat List</h4>
									<span class="variant-tag">variant="compact"</span>
								</div>
								<span class="density-badge">38-42px Height</span>
							</div>
							<p class="variant-desc">Optimal for task lists, subtasks, fast scannability, and high-frequency checks.</p>
							
							<div class="mini-list-box compact-box">
								<div class="mini-row">
									<span class="mini-check">✓</span>
									<span class="mini-title done">Schema Migration v2</span>
									<span class="mini-meta">Done</span>
								</div>
								<div class="mini-row">
									<span class="mini-circle">○</span>
									<span class="mini-title">Design SvelteKit List</span>
									<span class="mini-meta high">Today</span>
								</div>
								<div class="mini-row">
									<span class="mini-circle">○</span>
									<span class="mini-title">Audit Split Pane</span>
									<span class="mini-meta">Oct 02</span>
								</div>
							</div>
						</div>

						<!-- Variant 2: Bordered Grouped (Settings & Metrics) -->
						<div class="variant-preview-card">
							<div class="variant-card-header">
								<div>
									<h4 class="variant-name">2. Bordered Grouped List</h4>
									<span class="variant-tag">variant="bordered"</span>
								</div>
								<span class="density-badge">48-54px Height</span>
							</div>
							<p class="variant-desc">For system settings, profile attributes, integration connections, and ledgers.</p>
							
							<div class="mini-list-box bordered-box">
								<div class="mini-row-bordered">
									<div>
										<div class="mini-title">Sanctuary Sync</div>
										<div class="mini-sub">Automatic 24h backup</div>
									</div>
									<span class="status-pill active">Active</span>
								</div>
								<div class="mini-row-bordered">
									<div>
										<div class="mini-title">End-to-End Keys</div>
										<div class="mini-sub">Hardware Enclave</div>
									</div>
									<span class="status-pill">Configured</span>
								</div>
							</div>
						</div>

						<!-- Variant 3: Floating Interactive Strips -->
						<div class="variant-preview-card">
							<div class="variant-card-header">
								<div>
									<h4 class="variant-name">3. Interactive Strips</h4>
									<span class="variant-tag">variant="interactive"</span>
								</div>
								<span class="density-badge">Separate Rows</span>
							</div>
							<p class="variant-desc">For selectable document feeds, goal compass milestones, and navigation jumps.</p>
							
							<div class="mini-strips-box">
								<div class="mini-strip-item active">
									<span class="mini-title">Quarterly Horizon Target</span>
									<span class="mini-meta">Q4</span>
								</div>
								<div class="mini-strip-item">
									<span class="mini-title">Daily Reflection Entry</span>
									<span class="mini-meta">Today</span>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		{/if}

		<!-- TAB 1: Layout Paradigms (Bento, Cards, Magazine) -->
		{#if activeTab === 'paradigms'}
			<div class="tab-content-fade">
				<!-- Hero Overview -->
				<section class="ds-section">
					<div class="section-heading">
						<h2 class="section-title">Architectural Layout Paradigms</h2>
						<p class="section-desc">
							Strategic guidance on when to choose <strong>Magazine (Editorial)</strong>, <strong>Card-Based</strong>, or <strong>Bento Grid</strong> layouts in SvelteKit applications.
						</p>
					</div>

					<!-- Comparison Matrix Card -->
					<div class="matrix-card">
						<div class="matrix-header">
							<span class="matrix-title">Paradigm Comparison Matrix</span>
							<span class="matrix-badge">Design Strategy</span>
						</div>
						<div class="matrix-table-wrap">
							<table class="matrix-table">
								<thead>
									<tr>
										<th>Style</th>
										<th>Cognitive Focus</th>
										<th>Information Density</th>
										<th>Best Used In</th>
										<th>Real-World Benchmarks</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td><span class="style-pill magazine">Magazine</span></td>
										<td>Linear narrative & deep contemplation</td>
										<td>Low to Medium (typographic pacing)</td>
										<td>Journals, deep reading, reflection sheets</td>
										<td>Readwise Reader, Bear App, Substack, Medium</td>
									</tr>
									<tr>
										<td><span class="style-pill card">Card-Based</span></td>
										<td>High scanability & atomic entity actions</td>
										<td>Medium to High (bounded records)</td>
										<td>Task ledgers, goal boards, tag indexes</td>
										<td>Linear, Trello, Notion Databases, GitHub Projects</td>
									</tr>
									<tr>
										<td><span class="style-pill bento">Bento Grid</span></td>
										<td>Instant multi-metric overview & snapshot</td>
										<td>Very High (asymmetric tiles 1x1, 2x1, 2x2)</td>
										<td>Dashboards, weekly reviews, profile hub</td>
										<td>Apple iOS Widgets, Linear Insights, Supabase Dashboard</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<!-- Detailed Style Breakdown -->
				<div class="paradigms-grid">
					<!-- Bento Style Details & Interactive Mockup -->
					<div class="paradigm-detail-card">
						<div class="paradigm-header bento-accent">
							<div class="paradigm-icon">🍱</div>
							<div>
								<h3 class="paradigm-name">1. Bento Grid Layout</h3>
								<p class="paradigm-tagline">High-Impact Dashboard & Telemetry Snapshot</p>
							</div>
						</div>
						<div class="paradigm-body">
							<div class="paradigm-guide">
								<div class="guide-item">
									<strong class="guide-label">Why Use It:</strong>
									<p class="guide-text">
										Assembles heterogeneous data points (streaks, quick capture, charts, active objectives) in an organized 2D grid without visual chaos.
									</p>
								</div>
								<div class="guide-item">
									<strong class="guide-label">Where in The Commons:</strong>
									<p class="guide-text">
										<strong><code>/app/overview</code></strong>, weekly digest dashboards, and profile hub summary.
									</p>
								</div>
							</div>

							<!-- Bento Interactive Mini Canvas -->
							<div class="mini-bento-canvas">
								<div class="bento-tile tile-wide">
									<div class="bento-tile-title">Primary Focus Goal</div>
									<div class="bento-tile-body">Finish SvelteKit Migration (80%)</div>
									<div class="bento-progress-bar"><div class="bento-progress-fill" style="width: 80%;"></div></div>
								</div>
								<div class="bento-tile tile-square">
									<div class="bento-tile-title">Streak</div>
									<div class="bento-metric">14 <span class="unit">days</span></div>
								</div>
								<div class="bento-tile tile-square">
									<div class="bento-tile-title">Entries</div>
									<div class="bento-metric">42 <span class="unit">logs</span></div>
								</div>
								<div class="bento-tile tile-large">
									<div class="bento-tile-title">Recent Activity Feed</div>
									<div class="bento-mini-row"><span>• Morning reflection</span><span class="mini-time">8:30 AM</span></div>
									<div class="bento-mini-row"><span>• Tag schema migration</span><span class="mini-time">2:15 PM</span></div>
								</div>
							</div>
						</div>
					</div>

					<!-- Magazine Editorial Details & Interactive Mockup -->
					<div class="paradigm-detail-card">
						<div class="paradigm-header magazine-accent">
							<div class="paradigm-icon">📖</div>
							<div>
								<h3 class="paradigm-name">2. Magazine (Editorial) Layout</h3>
								<p class="paradigm-tagline">Print-Inspired Typography & Long-Form Narrative</p>
							</div>
						</div>
						<div class="paradigm-body">
							<div class="paradigm-guide">
								<div class="guide-item">
									<strong class="guide-label">Why Use It:</strong>
									<p class="guide-text">
										Prioritizes uninterrupted reading flow, warm typography (serif headers + clean body), pull quotes, and generous column margins.
									</p>
								</div>
								<div class="guide-item">
									<strong class="guide-label">Where in The Commons:</strong>
									<p class="guide-text">
										<strong><code>/app/diary/[id]</code></strong>, document readers, long-form reflection views, and archival manuscripts.
									</p>
								</div>
							</div>

							<!-- Magazine Interactive Mini Canvas -->
							<div class="mini-magazine-canvas">
								<div class="mag-masthead">
									<span class="mag-folio">Vol. IV • Leaf No. 24</span>
									<span class="mag-date">September 30</span>
								</div>
								<h4 class="mag-headline">A Serene Sanctuary for Thought</h4>
								<p class="mag-lead">
									Writing is not merely an inscription of records, but an architectural act of clarifying consciousness.
								</p>
								<blockquote class="mag-pullquote">
									"Simplicity is the final achievement."
								</blockquote>
							</div>
						</div>
					</div>

					<!-- Card-Based Details & Interactive Mockup -->
					<div class="paradigm-detail-card">
						<div class="paradigm-header card-accent">
							<div class="paradigm-icon">🗂️</div>
							<div>
								<h3 class="paradigm-name">3. Card-Based & Compact Lists</h3>
								<p class="paradigm-tagline">Modular Entity Scanning & Rapid Filtering</p>
							</div>
						</div>
						<div class="paradigm-body">
							<div class="paradigm-guide">
								<div class="guide-item">
									<strong class="guide-label">Why Use It:</strong>
									<p class="guide-text">
										Treats tasks, goals, and items as discrete manipulable units. Maintains uniform interactive affordances (drag, check, filter, sort).
									</p>
								</div>
								<div class="guide-item">
									<strong class="guide-label">Where in The Commons:</strong>
									<p class="guide-text">
										<strong><code>/app/goals</code></strong>, task ledgers, tag management, and entity explorer directories.
									</p>
								</div>
							</div>

							<!-- Card / List Interactive Mini Canvas -->
							<div class="mini-cards-canvas">
								<div class="mini-filter-bar">
									<span class="mini-chip active">All (3)</span>
									<span class="mini-chip">Active (2)</span>
									<span class="mini-chip">Done (1)</span>
								</div>
								<div class="mini-list-item">
									<div class="mini-check-box checked">✓</div>
									<div class="mini-item-info">
										<span class="mini-item-title done">Implement SvelteKit Theme</span>
										<span class="mini-item-desc">Completed at 18:15</span>
									</div>
								</div>
								<div class="mini-list-item">
									<div class="mini-check-box"></div>
									<div class="mini-item-info">
										<span class="mini-item-title">Design Bento Dashboard Tile</span>
										<span class="mini-item-desc">High Priority • Goals</span>
									</div>
								</div>
								<div class="mini-list-item">
									<div class="mini-check-box"></div>
									<div class="mini-item-info">
										<span class="mini-item-title">Integrate RLS Direct Query Layer</span>
										<span class="mini-item-desc">Supabase SDK</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Hybrid Recommendation Banner -->
				<div class="hybrid-banner">
					<div class="hybrid-banner-badge">Designer Verdict</div>
					<h4 class="hybrid-banner-title">The Recommended Commons Hybrid Architecture</h4>
					<p class="hybrid-banner-desc">
						Do not constrain the whole product to one style. Use <strong>Bento Grids</strong> for the <em>Overview Hub</em> to offer high-density glanceability, <strong>Editorial Magazine</strong> for <em>Diaries & Reading</em> to encourage deep focus, and <strong>Compact List Cards</strong> for <em>Goals & Ledgers</em> to enable rapid filtering and execution.
					</p>
				</div>
			</div>
		{/if}

		<!-- TAB 2: Brand Logotype & Archival Seal -->
		{#if activeTab === 'brand'}
			<section class="ds-section tab-content-fade">
				<div class="section-heading">
					<h2 class="section-title">1. Archival Brand Mark & Logotype</h2>
					<p class="section-desc">
						Official heraldic seal, compass star, and typography lockups for The Commons.
					</p>
				</div>

				<div class="grid-showcase">
					<div class="card">
						<div class="card-header">
							<span class="card-title">Horizontal Lockup (Default)</span>
							<span class="card-meta">Navigation & Headers</span>
						</div>
						<div class="card-content centered-preview">
							<CommonsLogo variant="horizontal" size="md" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>

					<div class="card">
						<div class="card-header">
							<span class="card-title">Stacked Broadside Colophon</span>
							<span class="card-meta">Auth Cards & Hero Splash</span>
						</div>
						<div class="card-content centered-preview">
							<CommonsLogo variant="stacked" size="lg" showFolio={true} subtitle="Archival Sanctuary & Ledger" />
						</div>
					</div>

					<div class="card">
						<div class="card-header">
							<span class="card-title">Archival Seal Vector</span>
							<span class="card-meta">Embossed Signet</span>
						</div>
						<div class="card-content centered-preview">
							<CommonsSealVector size={72} />
						</div>
					</div>

					<div class="card">
						<div class="card-header">
							<span class="card-title">Minimalist Compass Mark</span>
							<span class="card-meta">Favicons & Badges</span>
						</div>
						<div class="card-content centered-preview">
							<CommonsLogo variant="mark" size="md" />
						</div>
					</div>
				</div>

				<div class="section-heading" style="margin-top: 2.5rem;">
					<h2 class="section-title">2. Logos Tailored for All 5 Themes</h2>
					<p class="section-desc">
						Dedicated heraldic seals and logotypes harmonized for each atmospheric theme palette.
					</p>
				</div>

				<div class="grid-showcase" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
					<!-- 1. Warm Linen (Paper) -->
					<div class="card" style="background-color: #F6F4EE; border-color: #E3DDD1;">
						<div class="card-header" style="border-color: #E3DDD1;">
							<span class="card-title" style="color: #2C2825;">Warm Linen (Paper)</span>
							<span class="card-meta" style="color: #9E5A3C;">#9E5A3C / #D9C3B0</span>
						</div>
						<div class="card-content centered-preview" style="padding: 1.5rem 1rem; flex-direction: column; gap: 1rem;">
							<CommonsLogo variant="stacked" size="lg" theme="paper" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>

					<!-- 2. Botanical Sage -->
					<div class="card" style="background-color: #F3F4F1; border-color: #D7E0D6;">
						<div class="card-header" style="border-color: #D7E0D6;">
							<span class="card-title" style="color: #1E2522;">Botanical Sage</span>
							<span class="card-meta" style="color: #3A6053;">#3A6053 / #8CAFA3</span>
						</div>
						<div class="card-content centered-preview" style="padding: 1.5rem 1rem; flex-direction: column; gap: 1rem;">
							<CommonsLogo variant="stacked" size="lg" theme="sage" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>

					<!-- 3. Quiet Denim -->
					<div class="card" style="background-color: #F6F7F9; border-color: #DCE4EB;">
						<div class="card-header" style="border-color: #DCE4EB;">
							<span class="card-title" style="color: #1F2633;">Quiet Denim</span>
							<span class="card-meta" style="color: #415E78;">#415E78 / #8BA9C4</span>
						</div>
						<div class="card-content centered-preview" style="padding: 1.5rem 1rem; flex-direction: column; gap: 1rem;">
							<CommonsLogo variant="stacked" size="lg" theme="denim" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>

					<!-- 4. Sanctuary Classic -->
					<div class="card" style="background-color: #FAF8F5; border-color: #E5E1D8;">
						<div class="card-header" style="border-color: #E5E1D8;">
							<span class="card-title" style="color: #1E293B;">Sanctuary Classic</span>
							<span class="card-meta" style="color: #3368A0;">#3368A0 / #66A3BF</span>
						</div>
						<div class="card-content centered-preview" style="padding: 1.5rem 1rem; flex-direction: column; gap: 1rem;">
							<CommonsLogo variant="stacked" size="lg" theme="classic" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>

					<!-- 5. Midnight Basalt -->
					<div class="card" style="background-color: #181716; border-color: #34302B;">
						<div class="card-header" style="border-color: #34302B;">
							<span class="card-title" style="color: #EDE8DF;">Midnight Basalt</span>
							<span class="card-meta" style="color: #D49B55;">#D49B55 / #B37D3E</span>
						</div>
						<div class="card-content centered-preview" style="padding: 1.5rem 1rem; flex-direction: column; gap: 1rem;">
							<CommonsLogo variant="stacked" size="lg" theme="midnight" showFolio={true} subtitle="Archival Sanctuary" />
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- TAB 3: Core Color Palette -->
		{#if activeTab === 'colors'}
			<section class="ds-section tab-content-fade">
				<div class="section-heading">
					<h2 class="section-title">2. Core Color Palette (The Commons Theme)</h2>
					<p class="section-desc">
						Architectural palette anchoring primary actions, serene canvas tones, and high-contrast dark surfaces.
					</p>
				</div>

				<div class="palette-grid">
					{#each baseColorTokens as swatch}
						<div class="swatch-card">
							<button
								class="swatch-preview"
								style="background-color: {swatch.hex}; color: {swatch.textColor};"
								onclick={() => copyToClipboard(swatch.hex)}
								title="Click to copy HEX code"
							>
								<div class="swatch-overlay">
									<span>{copiedHex === swatch.hex ? '✓ Copied' : 'Copy HEX'}</span>
								</div>
								<span class="swatch-hex">{swatch.hex}</span>
							</button>
							<div class="swatch-meta">
								<div class="swatch-title-row">
									<span class="swatch-name">{swatch.name}</span>
									<span class="swatch-role">{swatch.role}</span>
								</div>
								<p class="swatch-desc">{swatch.description}</p>
								<div class="swatch-tags">
									{#each swatch.usage as tag}
										<span class="usage-tag">{tag}</span>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- TAB 4: Archival Diary & Parchment Palette -->
		{#if activeTab === 'diary'}
			<section class="ds-section tab-content-fade">
				<div class="section-heading">
					<h2 class="section-title">3. Archival Diary & Parchment Palette</h2>
					<p class="section-desc">
						Organic manuscript tones inspired by aged tea-stained paper, walnut ink, and terracotta wax seals.
					</p>
				</div>

				<div class="palette-grid">
					{#each diaryColorTokens as swatch}
						<div class="swatch-card">
							<button
								class="swatch-preview"
								style="background-color: {swatch.hex}; color: {swatch.textColor};"
								onclick={() => copyToClipboard(swatch.hex)}
								title="Click to copy HEX code"
							>
								<div class="swatch-overlay">
									<span>{copiedHex === swatch.hex ? '✓ Copied' : 'Copy HEX'}</span>
								</div>
								<span class="swatch-hex">{swatch.hex}</span>
							</button>
							<div class="swatch-meta">
								<div class="swatch-title-row">
									<span class="swatch-name">{swatch.name}</span>
									<span class="swatch-role">{swatch.role}</span>
								</div>
								<p class="swatch-desc">{swatch.description}</p>
								<div class="swatch-tags">
									{#each swatch.usage as tag}
										<span class="usage-tag">{tag}</span>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</main>
</div>

<style>
	/* Sub-nav Tab Navigation */
	.tab-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.375rem;
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-lg, 12px);
		margin-bottom: 1rem;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary, #94a3b8);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary, #f1f5f9);
		background: var(--bg-tertiary, #1f2533);
	}

	.tab-btn.active {
		color: #ffffff;
		background: #3368a0;
		border-color: #4682b4;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.tab-badge {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		background: rgba(255, 255, 255, 0.2);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	.tab-content-fade {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		animation: fadeIn 0.2s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Comparison Matrix */
	.matrix-card {
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-md, 10px);
		overflow: hidden;
	}

	.matrix-header {
		padding: 0.75rem 1rem;
		background: var(--bg-tertiary, #1f2533);
		border-bottom: 1px solid var(--border-subtle, #2d3748);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.matrix-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary, #f1f5f9);
	}

	.matrix-badge {
		font-size: 0.6875rem;
		font-family: var(--font-mono, monospace);
		color: var(--accent, #66a3bf);
	}

	.matrix-table-wrap {
		overflow-x: auto;
	}

	.matrix-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		text-align: left;
	}

	.matrix-table th {
		padding: 0.75rem 1rem;
		color: var(--text-muted, #94a3b8);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
		background: rgba(0, 0, 0, 0.1);
	}

	.matrix-table td {
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
		color: var(--text-secondary, #cbd5e1);
		vertical-align: middle;
	}

	.matrix-table tbody tr:last-child td {
		border-bottom: none;
	}

	.style-pill {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.style-pill.magazine {
		background: #f4ead4;
		color: #2c241e;
		border: 1px solid #c8bea8;
	}

	.style-pill.card {
		background: #3368a0;
		color: #ffffff;
	}

	.style-pill.bento {
		background: #1e2d3d;
		color: #c8dfdb;
		border: 1px solid #66a3bf;
	}

	/* Paradigm Grid & Detail Cards */
	.paradigms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.paradigm-detail-card {
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.paradigm-header {
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.875rem;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
	}

	.paradigm-header.bento-accent {
		background: rgba(51, 104, 160, 0.15);
		border-top: 3px solid #3368a0;
	}

	.paradigm-header.magazine-accent {
		background: rgba(140, 58, 39, 0.15);
		border-top: 3px solid #8c3a27;
	}

	.paradigm-header.card-accent {
		background: rgba(102, 163, 191, 0.15);
		border-top: 3px solid #66a3bf;
	}

	.paradigm-icon {
		font-size: 1.5rem;
	}

	.paradigm-name {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary, #f1f5f9);
	}

	.paradigm-tagline {
		font-size: 0.6875rem;
		color: var(--text-muted, #94a3b8);
	}

	.paradigm-body {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		flex: 1;
	}

	.paradigm-guide {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 0.8125rem;
	}

	.guide-item {
		line-height: 1.45;
	}

	.guide-label {
		color: var(--text-primary, #f1f5f9);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		display: block;
		margin-bottom: 0.125rem;
	}

	.guide-text {
		color: var(--text-secondary, #94a3b8);
	}

	.guide-text code {
		background: var(--bg-surface, #1e2533);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--accent, #66a3bf);
	}

	/* Mini Interactive Canvases */
	.mini-bento-canvas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-primary, #0f1117);
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #2d3748);
	}

	.bento-tile {
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: 6px;
		padding: 0.5rem 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.tile-wide {
		grid-column: span 2;
	}

	.tile-large {
		grid-column: span 2;
	}

	.bento-tile-title {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #94a3b8);
		text-transform: uppercase;
	}

	.bento-tile-body {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary, #f1f5f9);
	}

	.bento-progress-bar {
		height: 4px;
		background: var(--border-subtle, #2d3748);
		border-radius: 2px;
		overflow: hidden;
		margin-top: 0.25rem;
	}

	.bento-progress-fill {
		height: 100%;
		background: #3368a0;
	}

	.bento-metric {
		font-size: 1.125rem;
		font-weight: 700;
		color: #66a3bf;
	}

	.bento-metric .unit {
		font-size: 0.6875rem;
		font-weight: 400;
		color: var(--text-muted, #94a3b8);
	}

	.bento-mini-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--text-secondary, #94a3b8);
		padding: 0.125rem 0;
	}

	.mini-time {
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
	}

	/* Magazine Mini Canvas */
	.mini-magazine-canvas {
		background: #faf6ee;
		color: #2c241e;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #c8bea8;
		font-family: Georgia, serif;
	}

	.mag-masthead {
		display: flex;
		justify-content: space-between;
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #8c3a27;
		border-bottom: 1px solid rgba(44, 36, 30, 0.15);
		padding-bottom: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.mag-headline {
		font-size: 0.9375rem;
		font-weight: 700;
		margin: 0.25rem 0;
		color: #2c241e;
		line-height: 1.25;
	}

	.mag-lead {
		font-size: 0.6875rem;
		line-height: 1.45;
		color: #4a3728;
		margin-bottom: 0.5rem;
	}

	.mag-pullquote {
		margin: 0.5rem 0 0 0;
		padding-left: 0.5rem;
		border-left: 2px solid #8c3a27;
		font-style: italic;
		font-size: 0.6875rem;
		color: #8c3a27;
	}

	/* Cards / List Mini Canvas */
	.mini-cards-canvas {
		background: var(--bg-primary, #0f1117);
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #2d3748);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mini-filter-bar {
		display: flex;
		gap: 0.375rem;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
	}

	.mini-chip {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		background: var(--bg-surface, #1e2533);
		color: var(--text-muted, #94a3b8);
	}

	.mini-chip.active {
		background: #3368a0;
		color: #ffffff;
		font-weight: 600;
	}

	.mini-list-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: 6px;
	}

	.mini-check-box {
		width: 14px;
		height: 14px;
		border: 1px solid var(--border-subtle, #4b5563);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.625rem;
	}

	.mini-check-box.checked {
		background: #3368a0;
		border-color: #3368a0;
		color: #ffffff;
	}

	.mini-item-info {
		display: flex;
		flex-direction: column;
	}

	.mini-item-title {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-primary, #f1f5f9);
	}

	.mini-item-title.done {
		text-decoration: line-through;
		color: var(--text-muted, #64748b);
	}

	.mini-item-desc {
		font-size: 0.5625rem;
		color: var(--text-muted, #64748b);
	}

	/* Hybrid Banner */
	.hybrid-banner {
		background: linear-gradient(135deg, rgba(51, 104, 160, 0.15), rgba(30, 45, 61, 0.4));
		border: 1px solid rgba(102, 163, 191, 0.3);
		border-radius: var(--radius-lg, 12px);
		padding: 1.5rem;
		position: relative;
	}

	.hybrid-banner-badge {
		font-size: 0.6875rem;
		font-family: var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #66a3bf;
		margin-bottom: 0.375rem;
	}

	.hybrid-banner-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary, #f1f5f9);
		margin-bottom: 0.5rem;
	}

	.hybrid-banner-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary, #cbd5e1);
		line-height: 1.55;
	}

	.ds-container {
		min-height: 100vh;
		background: var(--bg-primary, #0f1117);
		color: var(--text-primary, #f1f5f9);
		font-family: var(--font-sans);
	}

	.ds-header {
		height: 60px;
		background: var(--bg-secondary, #161a23);
		border-bottom: 1px solid var(--border-subtle, #2d3748);
		position: sticky;
		top: 0;
		z-index: 20;
	}

	.header-inner {
		max-width: 1200px;
		height: 100%;
		margin: 0 auto;
		padding: 0 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.ds-badge {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: 0.1875rem 0.5rem;
		border-radius: var(--radius-sm);
		color: var(--accent);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.nav-link:hover {
		color: var(--primary);
	}

	.ds-body {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.ds-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.section-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.grid-showcase {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}

	.card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.card-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--bg-tertiary);
	}

	.card-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.card-meta {
		font-size: 0.6875rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.centered-preview {
		padding: 2.5rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 140px;
	}

	.palette-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1.25rem;
	}

	.swatch-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.swatch-preview {
		height: 110px;
		width: 100%;
		border: none;
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		padding: 0.75rem;
		cursor: pointer;
		outline: none;
		user-select: none;
	}

	.swatch-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: #ffffff;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.swatch-preview:hover .swatch-overlay {
		opacity: 1;
	}

	.swatch-hex {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		z-index: 1;
	}

	.swatch-meta {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.swatch-title-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.swatch-name {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.swatch-role {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--accent);
	}

	.swatch-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.swatch-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: auto;
		padding-top: 0.5rem;
	}

	.usage-tag {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
	}

	/* =========================================================================
	   COMPONENTS TAB - COMPACT LIST SHOWCASE STYLES
	   ========================================================================= */
	.component-demo-card {
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-lg, 12px);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.demo-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.demo-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary, #f1f5f9);
		margin: 0;
	}

	.demo-subtitle {
		font-size: 0.75rem;
		color: var(--text-secondary, #94a3b8);
		margin: 0.25rem 0 0 0;
	}

	.demo-badge {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		background: rgba(51, 104, 160, 0.2);
		color: #66a3bf;
		border: 1px solid rgba(51, 104, 160, 0.4);
		padding: 0.2rem 0.5rem;
		border-radius: 9999px;
		font-weight: 600;
	}

	/* Toolbar */
	.demo-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		background: var(--bg-primary, #0f1219);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-md, 8px);
	}

	.demo-search-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		min-width: 200px;
	}

	.search-icon {
		color: var(--text-muted, #64748b);
	}

	.demo-search-input {
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary, #f1f5f9);
		font-size: 0.8125rem;
		width: 100%;
	}

	.demo-search-input::placeholder {
		color: var(--text-muted, #64748b);
	}

	.demo-filter-pills {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #94a3b8);
		background: var(--bg-surface, #1e2533);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-pill:hover {
		color: var(--text-primary, #f1f5f9);
		border-color: #4682b4;
	}

	.filter-pill.active {
		background: #3368a0;
		color: #ffffff;
		border-color: #3368a0;
	}

	.pill-count {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		padding: 0.0625rem 0.3125rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 9999px;
	}

	.demo-count-tally {
		font-size: 0.6875rem;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
	}

	/* Compact List Table */
	.compact-list-container {
		background: var(--bg-primary, #0f1219);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.compact-list-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.875rem;
		min-height: 40px;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
		background: transparent;
		cursor: pointer;
		user-select: none;
		transition: background 0.12s ease;
	}

	.compact-list-row:last-child {
		border-bottom: none;
	}

	.compact-list-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.compact-list-row.completed {
		background: rgba(255, 255, 255, 0.015);
		opacity: 0.65;
	}

	.row-prefix {
		display: flex;
		align-items: center;
		margin-right: 0.75rem;
		flex-shrink: 0;
	}

	.custom-checkbox {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 1.5px solid var(--border-subtle, #4b5563);
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		color: #ffffff;
		transition: all 0.15s ease;
	}

	.custom-checkbox.checked {
		background: #10b981;
		border-color: #10b981;
	}

	.row-content {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	.row-text {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary, #f1f5f9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row-text.strike {
		text-decoration: line-through;
		color: var(--text-muted, #64748b);
	}

	.row-suffix {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: 0.75rem;
		flex-shrink: 0;
	}

	.row-tag {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		background: var(--bg-surface, #1e2533);
		color: var(--text-secondary, #94a3b8);
		border: 1px solid var(--border-subtle, #2d3748);
	}

	.row-priority {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-muted, #64748b);
	}

	.row-priority.high {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.row-due {
		font-size: 0.6875rem;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
		min-width: 48px;
		text-align: right;
	}

	.list-empty-state {
		padding: 2.5rem;
		text-align: center;
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #f1f5f9);
		margin: 0;
	}

	.empty-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted, #64748b);
		margin: 0.25rem 0 0 0;
	}

	/* Variants Grid */
	.list-variants-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.variant-preview-card {
		background: var(--bg-secondary, #161a23);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: var(--radius-md, 8px);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.variant-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.variant-name {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary, #f1f5f9);
		margin: 0;
	}

	.variant-tag {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		color: var(--accent, #66a3bf);
	}

	.density-badge {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		background: var(--bg-surface, #1e2533);
		color: var(--text-muted, #64748b);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	.variant-desc {
		font-size: 0.75rem;
		color: var(--text-secondary, #94a3b8);
		line-height: 1.4;
		margin: 0;
	}

	.mini-list-box {
		margin-top: auto;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--border-subtle, #2d3748);
		background: var(--bg-primary, #0f1219);
	}

	.mini-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
	}

	.mini-row:last-child {
		border-bottom: none;
	}

	.mini-check {
		color: #10b981;
		font-size: 0.6875rem;
		margin-right: 0.375rem;
	}

	.mini-circle {
		color: var(--text-muted, #64748b);
		font-size: 0.6875rem;
		margin-right: 0.375rem;
	}

	.mini-title {
		flex: 1;
		font-size: 0.75rem;
		color: var(--text-primary, #f1f5f9);
	}

	.mini-title.done {
		text-decoration: line-through;
		color: var(--text-muted, #64748b);
	}

	.mini-meta {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
	}

	.mini-meta.high {
		color: #f87171;
	}

	.mini-row-bordered {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		border-bottom: 1px solid var(--border-subtle, #2d3748);
	}

	.mini-row-bordered:last-child {
		border-bottom: none;
	}

	.mini-sub {
		font-size: 0.625rem;
		color: var(--text-muted, #64748b);
	}

	.status-pill {
		font-size: 0.625rem;
		font-family: var(--font-mono, monospace);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		background: var(--bg-surface, #1e2533);
		color: var(--text-muted, #64748b);
	}

	.status-pill.active {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
	}

	.mini-strips-box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-top: auto;
	}

	.mini-strip-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.625rem;
		background: var(--bg-primary, #0f1219);
		border: 1px solid var(--border-subtle, #2d3748);
		border-radius: 6px;
	}

	.mini-strip-item.active {
		border-color: #3368a0;
		background: rgba(51, 104, 160, 0.08);
	}
</style>
