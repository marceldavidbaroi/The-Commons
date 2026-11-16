import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export interface WikiLinkItem {
	id: string;
	title: string;
}

export interface WikiLinkOptions {
	getItems: (query: string) => WikiLinkItem[];
	onNavigate: (title: string, splitRight: boolean) => void;
}

export const WikiLink = Node.create<WikiLinkOptions>({
	name: 'wikiLink',
	group: 'inline',
	inline: true,
	atom: true,

	addOptions() {
		return {
			getItems: () => [],
			onNavigate: () => {}
		};
	},

	addAttributes() {
		return {
			target: {
				default: '',
				parseHTML: (el) => el.getAttribute('data-wiki-target') ?? '',
				renderHTML: (attrs) => ({ 'data-wiki-target': attrs.target })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-wiki-target]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, { class: 'wiki-link' }),
			`[[${node.attrs.target}]]`
		];
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				char: '[[',
				allowSpaces: true,
				items: ({ query }) => this.options.getItems(query),
				command: ({ editor, range, props }) => {
					const item = props as WikiLinkItem;
					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{ type: this.name, attrs: { target: item.title } },
							{ type: 'text', text: ' ' }
						])
						.run();
				},
				render: () => {
					let popup: HTMLDivElement | null = null;
					let selectedIndex = 0;
					let currentItems: WikiLinkItem[] = [];
					let currentCommand: ((item: WikiLinkItem) => void) | null = null;

					function renderList() {
						if (!popup) return;
						popup.innerHTML = '';
						if (currentItems.length === 0) {
							const empty = document.createElement('div');
							empty.className = 'wiki-suggestion-empty';
							empty.textContent = 'No matching notes';
							popup.appendChild(empty);
							return;
						}
						currentItems.forEach((item, idx) => {
							const btn = document.createElement('button');
							btn.type = 'button';
							btn.className = `wiki-suggestion-item${idx === selectedIndex ? ' selected' : ''}`;
							btn.textContent = item.title;
							btn.addEventListener('mousedown', (e) => {
								e.preventDefault();
								currentCommand?.(item);
							});
							popup!.appendChild(btn);
						});
					}

					return {
						onStart: (props) => {
							popup = document.createElement('div');
							popup.className = 'wiki-suggestion-popup';
							currentItems = props.items as WikiLinkItem[];
							currentCommand = props.command as (item: WikiLinkItem) => void;
							selectedIndex = 0;
							renderList();
							document.body.appendChild(popup);
							const rect = props.clientRect?.();
							if (rect && popup) {
								popup.style.left = `${rect.left}px`;
								popup.style.top = `${rect.bottom + 4}px`;
							}
						},
						onUpdate: (props) => {
							currentItems = props.items as WikiLinkItem[];
							currentCommand = props.command as (item: WikiLinkItem) => void;
							selectedIndex = 0;
							renderList();
							const rect = props.clientRect?.();
							if (rect && popup) {
								popup.style.left = `${rect.left}px`;
								popup.style.top = `${rect.bottom + 4}px`;
							}
						},
						onKeyDown: ({ event }) => {
							if (event.key === 'ArrowDown') {
								selectedIndex = (selectedIndex + 1) % Math.max(currentItems.length, 1);
								renderList();
								return true;
							}
							if (event.key === 'ArrowUp') {
								selectedIndex =
									(selectedIndex - 1 + Math.max(currentItems.length, 1)) %
									Math.max(currentItems.length, 1);
								renderList();
								return true;
							}
							if (event.key === 'Enter' && currentItems[selectedIndex]) {
								currentCommand?.(currentItems[selectedIndex]);
								return true;
							}
							if (event.key === 'Escape') {
								popup?.remove();
								popup = null;
								return true;
							}
							return false;
						},
						onExit: () => {
							popup?.remove();
							popup = null;
						}
					};
				}
			})
		];
	}
});
