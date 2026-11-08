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
  let isTableActive = $state(false);

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

  function updateActiveStates(ed: Editor) {
    isTableActive = ed.isActive('table');
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
      onSelectionUpdate: ({ editor: ed }) => {
        updateActiveStates(ed);
      },
      onTransaction: ({ editor: ed }) => {
        updateActiveStates(ed);
      },
      onUpdate: ({ editor: ed }) => {
        updateActiveStates(ed);
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
  <!-- Primary Toolbar -->
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

    <div style="height: 1rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>

    <button
      type="button"
      onclick={() => {
        if (!isTableActive) {
          editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }
      }}
      class="tasks-btn {isTableActive ? 'tasks-btn-secondary' : 'tasks-btn-ghost'}"
      style="padding: 0.2rem 0.5rem;"
      title={isTableActive ? "Table selected" : "Insert Table (3x3)"}
    >
      ▦ Table
    </button>

    <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">
      Type <kbd style="padding: 0.1rem 0.3rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-family: monospace;">[[</kbd> to link tasks
    </span>
  </div>

  <!-- Contextual Table Management Sub-Toolbar (Active when cursor inside table) -->
  {#if isTableActive}
    <div
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); font-size: 0.75rem;"
    >
      <span style="font-weight: 600; color: var(--text-secondary); margin-right: 0.25rem;">Columns:</span>
      <button
        type="button"
        onclick={() => editor?.chain().focus().addColumnBefore().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Add column to the left"
      >
        + Left
      </button>
      <button
        type="button"
        onclick={() => editor?.chain().focus().addColumnAfter().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Add column to the right"
      >
        + Right
      </button>
      <button
        type="button"
        onclick={() => editor?.chain().focus().deleteColumn().run()}
        class="tasks-btn tasks-btn-ghost"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem; color: var(--danger);"
        title="Delete current column"
      >
        - Col
      </button>

      <div style="height: 0.875rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>

      <span style="font-weight: 600; color: var(--text-secondary); margin-right: 0.25rem;">Rows:</span>
      <button
        type="button"
        onclick={() => editor?.chain().focus().addRowBefore().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Add row above"
      >
        + Above
      </button>
      <button
        type="button"
        onclick={() => editor?.chain().focus().addRowAfter().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Add row below"
      >
        + Below
      </button>
      <button
        type="button"
        onclick={() => editor?.chain().focus().deleteRow().run()}
        class="tasks-btn tasks-btn-ghost"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem; color: var(--danger);"
        title="Delete current row"
      >
        - Row
      </button>

      <div style="height: 0.875rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>

      <button
        type="button"
        onclick={() => editor?.chain().focus().toggleHeaderRow().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Toggle header row"
      >
        Header
      </button>
      <button
        type="button"
        onclick={() => editor?.chain().focus().mergeOrSplit().run()}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Merge or split selected cells"
      >
        Merge/Split
      </button>

      <button
        type="button"
        onclick={() => editor?.chain().focus().deleteTable().run()}
        class="tasks-btn tasks-btn-danger-ghost"
        style="margin-left: auto; padding: 0.15rem 0.4rem; font-size: 0.6875rem;"
        title="Delete the whole table"
      >
        Delete Table
      </button>
    </div>
  {/if}

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
    table-layout: fixed;
  }
  :global(.tasks-tiptap-content th) {
    background-color: var(--bg-tertiary);
    font-weight: 600;
    text-align: left;
  }
  :global(.tasks-tiptap-content th, .tasks-tiptap-content td) {
    border: 1px solid var(--border-subtle);
    padding: 0.5rem 0.65rem;
    vertical-align: top;
    position: relative;
  }
  :global(.tasks-tiptap-content .selectedCell:after) {
    z-index: 2;
    position: absolute;
    content: "";
    inset: 0;
    background: rgba(158, 90, 60, 0.15);
    pointer-events: none;
  }
  :global(.tasks-tiptap-content .column-resize-handle) {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background-color: var(--primary);
    pointer-events: none;
  }
</style>
