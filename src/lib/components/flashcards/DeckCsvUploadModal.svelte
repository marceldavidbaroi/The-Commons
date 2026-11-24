<script lang="ts">
	import { fade, scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import type { DeckRecord, CardTypeRecord } from "$lib/types/flashcards";

	let {
		isOpen = false,
		deck = null,
		cardTypes = [],
		onClose,
		onUpload,
	}: {
		isOpen: boolean;
		deck: DeckRecord | null;
		cardTypes: CardTypeRecord[];
		onClose: () => void;
		onUpload: (
			deckId: number | string,
			cardTypeId: number | string,
			rows: Record<string, string>[],
		) => Promise<void>;
	} = $props();

	let selectedCardTypeId = $state<number | string>("");
	let csvFile = $state<File | null>(null);
	let parsedRows = $state<Record<string, string>[]>([]);
	let csvHeaders = $state<string[]>([]);
	let columnMapping = $state<Record<string, string>>({}); // fieldName -> csvHeader
	let isUploading = $state(false);
	let errorMessage = $state<string | null>(null);
	let successCount = $state<number | null>(null);
	let showAiPrompt = $state(false);
	let copiedPrompt = $state(false);

	// Currently chosen card type record
	const activeCardType = $derived(
		cardTypes.find((ct) => String(ct.id) === String(selectedCardTypeId)) ||
			cardTypes[0],
	);

	// Schema fields for current card type
	const schemaFields = $derived(
		activeCardType?.fields_schema || [
			{ name: "Front", label: "Front", type: "title" },
			{ name: "Back", label: "Back", type: "description" },
		],
	);

	// Initialize card type when modal opens or deck changes
	$effect(() => {
		if (isOpen && deck) {
			errorMessage = null;
			successCount = null;
			showAiPrompt = false;
			copiedPrompt = false;
			csvFile = null;
			parsedRows = [];
			csvHeaders = [];
			columnMapping = {};
			isUploading = false;

			if (deck.config?.card_type_id) {
				selectedCardTypeId = deck.config.card_type_id;
			} else if (cardTypes.length > 0) {
				selectedCardTypeId = cardTypes[0].id;
			}
		}
	});

	// Re-map columns automatically when headers or card type change
	$effect(() => {
		if (csvHeaders.length > 0 && schemaFields.length > 0) {
			const mapping: Record<string, string> = {};
			for (let i = 0; i < schemaFields.length; i++) {
				const f = schemaFields[i];
				const fieldKey = f.label || f.name || `field_${i}`;
				// Exact match or case-insensitive match
				const matched = csvHeaders.find(
					(h) =>
						h.trim().toLowerCase() === fieldKey.trim().toLowerCase() ||
						(f.name && h.trim().toLowerCase() === f.name.trim().toLowerCase())
				);
				if (matched) {
					mapping[fieldKey] = matched;
				} else if (i < csvHeaders.length) {
					// Fallback to sequential position
					mapping[fieldKey] = csvHeaders[i];
				} else {
					mapping[fieldKey] = "";
				}
			}
			columnMapping = mapping;
		}
	});

	function parseCSV(text: string): { headers: string[]; rows: string[][] } {
		// Detect delimiter: comma or tab (TSV/spreadsheet paste)
		const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
		const tabCount = (firstLine.match(/\t/g) || []).length;
		const commaCount = (firstLine.match(/,/g) || []).length;
		const delimiter = tabCount > commaCount ? "\t" : ",";

		const lines: string[] = [];
		let row: string[] = [];
		let inQuotes = false;
		let currentVal = "";

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const nextChar = text[i + 1];

			if (char === '"') {
				if (inQuotes && nextChar === '"') {
					currentVal += '"';
					i++; // Skip escaped quote
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delimiter && !inQuotes) {
				row.push(currentVal.trim());
				currentVal = "";
			} else if ((char === "\r" || char === "\n") && !inQuotes) {
				if (char === "\r" && nextChar === "\n") {
					i++;
				}
				row.push(currentVal.trim());
				currentVal = "";
				if (row.some((cell) => cell.length > 0)) {
					lines.push(row as any);
				}
				row = [];
			} else {
				currentVal += char;
			}
		}

		if (currentVal.length > 0 || row.length > 0) {
			row.push(currentVal.trim());
			if (row.some((cell) => cell.length > 0)) {
				lines.push(row as any);
			}
		}

		if (lines.length === 0) {
			return { headers: [], rows: [] };
		}

		const headers = (lines[0] as unknown as string[]).map((h) =>
			h.replace(/^["']|["']$/g, "").trim(),
		);
		const rawRows = lines.slice(1) as unknown as string[][];

		return { headers, rows: rawRows };
	}

	const generatedAiPrompt = $derived.by(() => {
		const headers = schemaFields
			.map((f) => `"${(f.label || f.name || "").replace(/"/g, '""')}"`)
			.join(",");

		const fieldGuidelines = schemaFields
			.map((f, idx) => {
				const label = f.label || f.name;
				const type = f.type || "title";
				const lowerLabel = (label || "").toLowerCase();

				if (type === "title" || idx === 0 || lowerLabel.includes("front") || lowerLabel.includes("prompt")) {
					return `- "${label}": The corrected word (Title Case, plain text).`;
				}
				if (type === "description" || idx === 1 || lowerLabel.includes("back") || lowerLabel.includes("answer") || lowerLabel.includes("definition")) {
					return `- "${label}": Plain definition only (do NOT include labels or markdown headers like "### Definition").`;
				}
				if (type === "date") {
					return `- "${label}": Date formatted as YYYY-MM-DD.`;
				}
				return `- "${label}": Exactly 3 bulleted everyday examples formatted as:
  - Example 1
  - Example 2
  - Example 3
  (do NOT include headers like "### Everyday Examples").`;
			})
			.join("\n");

		return `You are a vocabulary flashcard generator.

Task:
1. Fix any typos or misspellings in the provided list of words.
2. Provide a clear, simple definition for each word.
3. Provide 3 simple, day-to-day example sentences for each word.
4. Output the result directly as a downloadable CSV file using Python, and also provide the raw CSV code block.

CSV Specifications:
1. Header row (must match exactly):
${headers}
2. Column formatting:
${fieldGuidelines}
3. CSV syntax rules:
- Every cell must be enclosed in double quotes ("...").
- Internal double quotes must be escaped as ("").
- Line breaks inside cells must be preserved.

Output instructions:
- Use Python code to create and save the output directly as a downloadable CSV file.
- Show the raw CSV text inside a single code block for direct copying.
- Do NOT output Markdown tables, conversational greetings, or closing explanations.

Here are the words:
[PASTE YOUR WORDS HERE]`;
	});

	async function copyAiPrompt() {
		try {
			await navigator.clipboard.writeText(generatedAiPrompt);
			copiedPrompt = true;
			setTimeout(() => {
				copiedPrompt = false;
			}, 2500);
		} catch (err) {
			console.error("Failed to copy AI prompt:", err);
		}
	}

	function normalizeDateValue(raw: string): string {
		const trimmed = raw.trim();
		if (!trimmed) return "";
		// If already in YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
		// Try parsing standard formats
		const parsed = new Date(trimmed);
		if (!isNaN(parsed.getTime())) {
			return parsed.toISOString().split("T")[0];
		}
		return trimmed;
	}

	function downloadBlankCsv() {
		if (schemaFields.length === 0) return;
		const headersRow = schemaFields
			.map((f) => `"${(f.label || f.name || "").replace(/"/g, '""')}"`)
			.join(",");

		// Generate realistic, type-specific sample values
		const todayIso = new Date().toISOString().split("T")[0];
		const sample1Values = schemaFields.map((f) => {
			if (f.type === "date") return `"${todayIso}"`;
			if (f.type === "description") {
				return `"### Overview\nKey points and explanation.\n- Bullet point 1\n- Bullet point 2"`;
			}
			// default to title
			return `"Sample ${f.label || f.name} title"`;
		});

		const sample2Values = schemaFields.map((f) => {
			if (f.type === "date") return `"2026-12-31"`;
			if (f.type === "description") {
				return `"Detailed description or answer goes here."`;
			}
			return `"Another ${f.label || f.name} item"`;
		});

		const sampleRow1 = sample1Values
			.map((v) => v.replace(/\n/g, "\r\n"))
			.join(",");
		const sampleRow2 = sample2Values
			.map((v) => v.replace(/\n/g, "\r\n"))
			.join(",");

		const csvContent = `${headersRow}\r\n${sampleRow1}\r\n${sampleRow2}\r\n`;
		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const safeDeckName = (deck?.name || "deck")
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "_");
		const typeName = (activeCardType?.name || "standard")
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "_");
		link.href = url;
		link.download = `${safeDeckName}_${typeName}_sample.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		csvFile = file;
		errorMessage = null;

		try {
			const text = await file.text();
			const { headers, rows } = parseCSV(text);

			if (headers.length === 0) {
				errorMessage = "The selected file is empty.";
				return;
			}

			csvHeaders = headers;

			// Store parsed rows as array of header -> value objects
			const objects: Record<string, string>[] = [];
			for (const r of rows) {
				const rowObj: Record<string, string> = {};
				for (let i = 0; i < headers.length; i++) {
					rowObj[headers[i]] = r[i] !== undefined ? r[i] : "";
				}
				objects.push(rowObj);
			}
			parsedRows = objects;
		} catch (err: any) {
			console.error("Failed to read CSV:", err);
			errorMessage = err.message || "Failed to read CSV file.";
		}
	}

	async function handleImport() {
		if (!deck) return;
		if (!activeCardType) {
			errorMessage = "Please select a card type.";
			return;
		}
		if (parsedRows.length === 0) {
			errorMessage = "No valid rows found to import.";
			return;
		}

		isUploading = true;
		errorMessage = null;

		try {
			// Construct mapped items based on schema
			const itemsToUpload: Record<string, string>[] = [];

			for (const row of parsedRows) {
				const fields: Record<string, string> = {};
				let hasContent = false;

				for (let i = 0; i < schemaFields.length; i++) {
					const field = schemaFields[i];
					const fieldKey = field.label || field.name || `field_${i}`;
					const mappedCol = columnMapping[fieldKey];
					let val = (
						mappedCol && row[mappedCol] ? row[mappedCol] : ""
					).trim();
					if (field.type === "date" && val) {
						val = normalizeDateValue(val);
					}
					fields[fieldKey] = val;
					if (val) hasContent = true;
				}

				if (hasContent) {
					itemsToUpload.push(fields);
				}
			}

			if (itemsToUpload.length === 0) {
				errorMessage = "All rows appear to be empty or unmapped.";
				isUploading = false;
				return;
			}

			await onUpload(deck.id, activeCardType.id, itemsToUpload);
			successCount = itemsToUpload.length;
			setTimeout(() => {
				onClose();
			}, 1200);
		} catch (err: any) {
			console.error("Import failed:", err);
			errorMessage =
				err.message || "An error occurred while importing cards.";
		} finally {
			isUploading = false;
		}
	}
</script>

{#if isOpen && deck}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="presentation"
	>
		<div
			class="modal-dialog"
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-labelledby="csv-modal-title"
			aria-modal="true"
		>
			<div class="modal-header">
				<div class="header-titles">
					<h3 id="csv-modal-title" class="modal-title">
						Upload CSV to {deck.name}
					</h3>
					<span class="modal-subtitle"
						>Import flashcards into deck matching field schema</span
					>
				</div>
				<button
					type="button"
					class="btn-close"
					onclick={onClose}
					aria-label="Close modal"
					disabled={isUploading}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<div class="modal-body">
				{#if errorMessage}
					<div class="error-banner" role="alert">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				{#if successCount !== null}
					<div class="success-banner" role="status">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						<span>Successfully imported {successCount} cards!</span>
					</div>
				{/if}

				<!-- Card Type Selection -->
				<div class="form-group">
					<div class="card-type-header-row">
						<label for="csv-card-type" class="form-label no-margin">
							<span>Card Type</span>
						</label>
						<div class="header-actions-group">
							<button
								type="button"
								class="btn-text-action"
								onclick={() => (showAiPrompt = !showAiPrompt)}
								title="Customize AI prompt for this schema"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
								</svg>
								<span>{showAiPrompt ? "Hide AI Prompt" : "AI Prompt Generator"}</span>
							</button>
							<button
								type="button"
								class="btn-download-template"
								onclick={downloadBlankCsv}
								title="Download empty CSV template for this card type"
								disabled={isUploading}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
									/>
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								<span>Sample CSV</span>
							</button>
						</div>
					</div>
					<select
						id="csv-card-type"
						class="form-select"
						bind:value={selectedCardTypeId}
						disabled={isUploading}
					>
						{#each cardTypes as ct (ct.id)}
							<option value={ct.id}>
								{ct.name} ({ct.fields_schema
									?.map((f) => f.label || f.name)
									.join(", ") || "Front, Back"})
							</option>
						{/each}
					</select>
					<span class="label-hint">Defines the template schema for imported columns</span>
				</div>

				<!-- AI Prompt Customizer Accordion / Panel -->
				{#if showAiPrompt}
					<div class="ai-prompt-box">
						<div class="ai-prompt-header">
							<div class="ai-prompt-title">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10" />
									<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
								<span>CSV Format Prompt for AI</span>
							</div>
							<button
								type="button"
								class="btn-copy-prompt"
								onclick={copyAiPrompt}
								title="Copy format instructions to clipboard"
							>
								{#if copiedPrompt}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="20 6 9 17 4 12" />
									</svg>
									<span>Copied!</span>
								{:else}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
									</svg>
									<span>Copy Format Prompt</span>
								{/if}
							</button>
						</div>

						<p class="ai-prompt-desc">
							Append this format specification to your prompt in ChatGPT, Claude, or Gemini so the generated CSV matches this schema exactly.
						</p>

						<div class="ai-prompt-preview-wrap">
							<pre class="ai-prompt-code">{generatedAiPrompt}</pre>
						</div>
					</div>
				{/if}

				<!-- File Picker -->
				<div class="form-group">
					<label for="csv-file-input" class="form-label">
						<span>CSV File</span>
						<span class="label-hint">.csv file with headers</span>
					</label>
					<div class="file-dropzone">
						<input
							id="csv-file-input"
							type="file"
							accept=".csv,text/csv"
							class="file-input"
							onchange={handleFileSelect}
							disabled={isUploading}
						/>
						<div class="dropzone-content">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								class="upload-icon"
							>
								<path
									d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
								/>
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
							{#if csvFile}
								<span class="file-name"
									>{csvFile.name} ({parsedRows.length} rows found)</span
								>
							{:else}
								<span class="file-prompt"
									>Click or drag CSV file here</span
								>
							{/if}
						</div>
					</div>
				</div>

				<!-- Field Mapping Section -->
				{#if csvHeaders.length > 0}
					<div class="mapping-section">
						<h4 class="mapping-title">Field Mapping</h4>
						<p class="mapping-desc">
							Match each card field to the corresponding CSV
							column:
						</p>

						<div class="mapping-grid">
							{#each schemaFields as field, i (field.label || field.name || i)}
								{@const fieldKey = field.label || field.name || `field_${i}`}
								<div class="mapping-row">
									<div class="field-label-cell">
										<span class="field-name"
											>{field.label || field.name}</span
										>
										{#if field.type}
											<span class="field-tag"
												>{field.type}</span
											>
										{/if}
									</div>
									<div class="field-arrow">➔</div>
									<div class="field-select-cell">
										<select
											class="form-select compact"
											bind:value={
												columnMapping[fieldKey]
											}
											disabled={isUploading}
										>
											<option value=""
												>-- Ignore Field --</option
											>
											{#each csvHeaders as header}
												<option value={header}
													>Column: {header}</option
												>
											{/each}
										</select>
									</div>
								</div>
							{/each}
						</div>

						{#if parsedRows.length > 0}
							<div class="preview-box">
								<span class="preview-title">Row 1 Preview:</span
								>
								<div class="preview-fields">
									{#each schemaFields as field, i}
										{@const fieldKey = field.label || field.name || `field_${i}`}
										<div class="preview-item">
											<strong
												>{field.label ||
													field.name}:</strong
											>
											<span
												>{columnMapping[fieldKey]
													? parsedRows[0][
															columnMapping[
																fieldKey
															]
														] || "—"
													: "—"}</span
											>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={onClose}
					disabled={isUploading}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleImport}
					disabled={isUploading || parsedRows.length === 0}
				>
					{#if isUploading}
						<div class="spinner-sm"></div>
						<span>Importing ({parsedRows.length})...</span>
					{:else}
						<span
							>Import {parsedRows.length > 0
								? `${parsedRows.length} Cards`
								: "Cards"}</span
						>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
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

	.modal-dialog {
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		width: 100%;
		max-width: 520px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
	}

	.modal-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.modal-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted);
		display: block;
		margin-top: 0.125rem;
	}

	.btn-close {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.btn-close:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-close svg {
		width: 16px;
		height: 16px;
	}

	.modal-body {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.125rem;
		overflow-y: auto;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.card-type-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.form-label.no-margin {
		flex: 1;
		margin: 0;
	}

	.header-actions-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.btn-text-action {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		padding: 0.25rem 0.5rem;
		font-size: 0.725rem;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-text-action:hover {
		background-color: var(--bg-tertiary);
		border-color: var(--border-focus);
		color: var(--text-primary);
	}

	.btn-text-action svg {
		width: 12px;
		height: 12px;
	}

	.ai-prompt-box {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.ai-prompt-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ai-prompt-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.ai-prompt-title svg {
		width: 14px;
		height: 14px;
		color: var(--primary);
	}

	.btn-copy-prompt {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background-color: var(--primary);
		color: var(--primary-foreground);
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.btn-copy-prompt:hover {
		background-color: var(--primary-hover);
	}

	.btn-copy-prompt svg {
		width: 12px;
		height: 12px;
	}

	.ai-prompt-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.ai-prompt-preview-wrap {
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		max-height: 140px;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.ai-prompt-code {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--text-secondary);
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.btn-download-template {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--primary);
		padding: 0.25rem 0.5rem;
		font-size: 0.725rem;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-download-template:hover:not(:disabled) {
		background-color: var(--bg-tertiary);
		border-color: var(--primary);
	}

	.btn-download-template:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-download-template svg {
		width: 13px;
		height: 13px;
	}

	.form-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.label-hint {
		font-size: 0.6875rem;
		font-weight: 400;
		color: var(--text-muted);
	}

	.form-select {
		width: 100%;
		padding: 0.55rem 0.75rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-select:focus {
		border-color: var(--border-focus);
	}

	.form-select.compact {
		padding: 0.35rem 0.5rem;
		font-size: 0.8rem;
		width: 100%;
	}

	.file-dropzone {
		position: relative;
		border: 1.5px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.5rem 1.25rem;
		text-align: center;
		cursor: pointer;
		background-color: var(--bg-secondary);
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.file-dropzone:hover {
		border-color: var(--primary);
		background-color: var(--bg-tertiary);
	}

	.file-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.dropzone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}

	.upload-icon {
		width: 24px;
		height: 24px;
		color: var(--text-muted);
	}

	.file-name {
		font-size: 0.875rem;
		color: var(--primary);
		font-weight: 600;
	}

	.file-prompt {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.mapping-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-top: 1px solid var(--border-subtle);
		padding-top: 0.75rem;
	}

	.mapping-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.mapping-desc {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.mapping-grid {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.mapping-row {
		display: grid;
		grid-template-columns: 1fr auto 1.4fr;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.field-label-cell {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.field-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.field-tag {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.field-arrow {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.preview-box {
		padding: 0.625rem 0.75rem;
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		font-size: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-title {
		font-weight: 600;
		color: var(--text-muted);
	}

	.preview-fields {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.preview-item strong {
		color: var(--text-secondary);
		margin-right: 0.25rem;
	}

	.preview-item span {
		color: var(--text-primary);
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background-color: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
		border-radius: var(--radius-sm);
		color: var(--danger, #c94a4a);
		font-size: 0.8rem;
	}

	.error-banner svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.success-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background-color: color-mix(in srgb, var(--success, #22c55e) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--success, #22c55e) 30%, transparent);
		border-radius: var(--radius-sm);
		color: var(--success, #16a34a);
		font-size: 0.8rem;
	}

	.success-banner svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.875rem 1.25rem;
		border-top: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background-color: var(--bg-primary);
		border-color: var(--border-subtle);
		color: var(--text-secondary);
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--text-primary);
		border-color: var(--border-focus);
		background-color: var(--bg-tertiary);
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner-sm {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
