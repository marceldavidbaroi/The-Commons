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
          class: 'tasks-badge',
          style: 'color: var(--primary); cursor: pointer; text-decoration: none;'
        },
        HTMLAttributes
      ),
      `# ${node.attrs.title || 'Task'}`
    ];
  }
});
