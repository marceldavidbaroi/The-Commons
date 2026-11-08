<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Table } from '@tiptap/extension-table';
  import { TableRow } from '@tiptap/extension-table-row';
  import { TableHeader } from '@tiptap/extension-table-header';
  import { TableCell } from '@tiptap/extension-table-cell';
  import { TaskList } from '@tiptap/extension-task-list';
  import { TaskItem } from '@tiptap/extension-task-item';
  import { TaskChipNode } from './TaskChipNode';
  import * as tasksService from '$lib/services/tasks-service';

  interface Props {
    contentHtml: string;
    listId: string;
    excludeTaskId?: string;
    onChange: (html: string) => void;
  }

  let { contentHtml, listId, excludeTaskId, onChange }: Props = $props();

  let element: HTMLElement | null = $state(null);
  let editor: Editor | null = $state(null);

  // Link picker popup state
  let showPicker = $state(false);
  let pickerQuery = $state('');
  let pickerResults = $state<Array<{ id: string; title: string }>>([]);
  let pickerCoords = $state<{ top: number; left: number }>({ top: 0, left: 0 });

  async function searchTasks(query: string) {
    pickerQuery = query;
    const res = await tasksService.searchListTasks(listId, query, excludeTaskId);
    pickerResults = res;
  }

  function insertTaskChip(task: { id: string; title: string }) {
    if (!editor) return;
    showPicker = false;

    // Delete the trigger characters e.g. [[
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: Math.max(0, from - 2 - pickerQuery.length), to: from })
      .insertContent({
        type: 'taskChip',
        attrs: {
          'data-task-id': task.id,
          title: task.title
        }
      })
      .insertContent(' ')
      .run();
  }

  onMount(() => {
    if (!element) return;

    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        TaskChipNode
      ],
      content: contentHtml,
      editorProps: {
        attributes: {
          class:
            'prose prose-sm dark:prose-invert max-w-none min-h-[160px] p-3 focus:outline-none text-slate-800 dark:text-slate-200'
        },
        handleKeyDown: (view, event) => {
          if (event.key === '[' && view.state.selection.empty) {
            const pos = view.state.selection.from;
            const textBefore = view.state.doc.textBetween(Math.max(0, pos - 1), pos, '\n', '\0');
            if (textBefore === '[') {
              // Trigger [[ picker
              const coords = view.coordsAtPos(pos);
              pickerCoords = { top: coords.bottom + window.scrollY, left: coords.left + window.scrollX };
              showPicker = true;
              searchTasks('');
            }
          } else if (showPicker && event.key === 'Escape') {
            showPicker = false;
            return true;
          }
          return false;
        }
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      }
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });
</script>

<div class="relative rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
  <!-- Minimal Toolbar -->
  <div class="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-1.5 text-xs">
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleBold().run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
      title="Bold"
    >
      B
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleItalic().run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 italic"
      title="Italic"
    >
      I
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold"
      title="Heading"
    >
      H2
    </button>
    <div class="h-3.5 w-px bg-slate-300 dark:bg-slate-700"></div>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleBulletList().run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
      title="Bullet list"
    >
      • List
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleTaskList().run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
      title="Checklist"
    >
      ☑ Check
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
      class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
      title="Insert Table"
    >
      ▦ Table
    </button>
    <span class="ml-auto text-[11px] text-slate-400">Type <kbd class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">[[</kbd> to link tasks</span>
  </div>

  <div bind:this={element} class="min-h-[200px]"></div>

  {#if showPicker}
    <div
      class="fixed inset-0 z-40"
      onclick={() => (showPicker = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div
      class="fixed z-50 w-64 rounded-md bg-white dark:bg-slate-900 p-2 shadow-xl border border-slate-200 dark:border-slate-800 text-xs"
      style={`top: ${pickerCoords.top + 4}px; left: ${pickerCoords.left}px;`}
    >
      <input
        type="text"
        placeholder="Search tasks to link..."
        bind:value={pickerQuery}
        oninput={(e) => searchTasks(e.currentTarget.value)}
        autofocus
        class="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary mb-2"
      />

      <div class="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {#if pickerResults.length === 0}
          <div class="py-2 text-center text-slate-400">No matching tasks</div>
        {:else}
          {#each pickerResults as task}
            <button
              type="button"
              onclick={() => insertTaskChip(task)}
              class="flex w-full items-center px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-800 dark:text-slate-200 truncate"
            >
              # {task.title}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

