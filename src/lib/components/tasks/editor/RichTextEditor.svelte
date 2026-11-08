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
    listId: number | string;
    excludeTaskId?: number | string;
    onChange: (html: string) => void;
  }

  let { contentHtml, listId, excludeTaskId, onChange }: Props = $props();

  let element: HTMLElement | null = $state(null);
  let editor: Editor | null = $state(null);

  // Link picker popup state
  let showPicker = $state(false);
  let pickerQuery = $state('');
  let pickerResults = $state<Array<{ id: number; title: string }>>([]);
  let pickerCoords = $state<{ top: number; left: number }>({ top: 0, left: 0 });

  async function searchTasks(query: string) {
    pickerQuery = query;
    const res = await tasksService.searchListTasks(listId, query, excludeTaskId);
    pickerResults = res;
  }

  function insertTaskChip(task: { id: number; title: string }) {
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
          class: 'tasks-tiptap-content'
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

<div class="tasks-table-wrapper" style="overflow: visible; position: relative;">
  <!-- Minimal Toolbar -->
  <div class="tasks-table-header" style="gap: 0.25rem;">
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleBold().run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem; font-weight: bold;"
      title="Bold"
    >
      B
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleItalic().run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem; font-style: italic;"
      title="Italic"
    >
      I
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem; font-weight: 600;"
      title="Heading"
    >
      H2
    </button>
    <div style="height: 1rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleBulletList().run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem;"
      title="Bullet list"
    >
      • List
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().toggleTaskList().run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem;"
      title="Checklist"
    >
      ☑ Check
    </button>
    <button
      type="button"
      onclick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0.2rem 0.4rem;"
      title="Insert Table"
    >
      ▦ Table
    </button>
    <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">
      Type <kbd style="padding: 0.1rem 0.3rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-family: monospace;">[[</kbd> to link tasks
    </span>
  </div>

  <div bind:this={element} style="min-height: 200px; padding: 0.75rem;"></div>

  {#if showPicker}
    <div
      style="position: fixed; inset: 0; z-index: 40;"
      onclick={() => (showPicker = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div
      class="tasks-dropdown-menu"
      style="position: fixed; top: {pickerCoords.top + 4}px; left: {pickerCoords.left}px; width: 260px; padding: 0.5rem; z-index: 50;"
    >
      <input
        type="text"
        placeholder="Search tasks to link..."
        bind:value={pickerQuery}
        oninput={(e) => searchTasks(e.currentTarget.value)}
        autofocus
        class="tasks-input"
        style="width: 100%; margin-bottom: 0.5rem;"
      />

      <div style="max-height: 160px; overflow-y: auto;">
        {#if pickerResults.length === 0}
          <div style="padding: 0.5rem 0; text-align: center; color: var(--text-muted); font-size: 0.75rem;">No matching tasks</div>
        {:else}
          {#each pickerResults as task}
            <button
              type="button"
              onclick={() => insertTaskChip(task)}
              class="tasks-dropdown-item"
            >
              # {task.title}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.tasks-tiptap-content) {
    min-height: 180px;
    outline: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.6;
  }
  :global(.tasks-tiptap-content p) {
    margin-bottom: 0.5rem;
  }
  :global(.tasks-tiptap-content ul) {
    padding-left: 1.25rem;
    margin-bottom: 0.5rem;
  }
  :global(.tasks-tiptap-content ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
  }
  :global(.tasks-tiptap-content li[data-type="taskItem"]) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.tasks-tiptap-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0;
  }
  :global(.tasks-tiptap-content th, .tasks-tiptap-content td) {
    border: 1px solid var(--border-subtle);
    padding: 0.4rem 0.6rem;
  }
</style>
