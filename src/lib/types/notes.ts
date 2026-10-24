export interface FolderRecord {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at?: string;
  deleted_at: string | null;
}

export interface NoteStub {
  id: string;
  folder_id: string | null;
  title: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteDetail {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WorkspaceTab {
  id: string;
  type: 'note' | 'graph';
  noteId?: string;
  title: string;
  pinned: boolean;
}

export interface WorkspacePane {
  id: string;
  tabs: WorkspaceTab[];
  activeTabIndex: number;
}

export interface GraphNode {
  id: string;
  title: string;
  isGhost: boolean;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface TrashedItem {
  id: string;
  type: 'note' | 'folder';
  name: string;
  deleted_at: string;
  parent_id?: string | null;
}
