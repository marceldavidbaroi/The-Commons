export interface QuickNote {
	id: number;
	title: string;
	content: string;
	preview: string;
	is_pinned: boolean;
	is_locked: boolean;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface CreateQuickNotePayload {
	title?: string;
	content?: string;
	preview?: string;
	is_pinned?: boolean;
	is_locked?: boolean;
}

export interface UpdateQuickNotePayload {
	title?: string;
	content?: string;
	preview?: string;
	is_pinned?: boolean;
	is_locked?: boolean;
	updated_at?: string;
}

export interface QuickNoteCursor {
	is_pinned: boolean;
	updated_at: string;
	id: number;
}

export interface TrashedQuickNoteCursor {
	deleted_at: string;
	id: number;
}
