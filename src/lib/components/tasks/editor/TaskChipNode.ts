import { Node, mergeAttributes } from '@tiptap/core';

export const TaskChipNode = Node.create({
  name: 'taskChip',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      'data-task-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-task-id'),
        renderHTML: (attributes) => ({
          'data-task-id': attributes['data-task-id']
        })
      },
      'data-type': {
        default: 'task-link',
        renderHTML: () => ({
          'data-type': 'task-link'
        })
      },
      title: {
        default: '',
        parseHTML: (element) => element.textContent || '',
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-task-id]'
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          class:
            'inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-primary px-1.5 py-0.5 text-xs font-medium cursor-pointer border border-slate-200 dark:border-slate-700'
        },
        HTMLAttributes
      ),
      `# ${node.attrs.title || 'Task'}`
    ];
  }
});

