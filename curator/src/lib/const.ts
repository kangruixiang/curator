import { POCKETBASE_URL } from '$env/dynamic/public';

// Pocketbase login
export const superUser = 'admin@pocketbase.com'
export const superUserPass = 'amiodarone'

// Pocketbase collections
export const notebooksCollection = 'notebooks'
export const notesCollection = 'notes'
export const tagsCollection = 'tags'
export const viewTagsCollectionName = 'tags_with_note_counts'
export const viewNotesCollection = 'notes_without_content'
export const viewNotebooksCollection = 'notebooks_with_note_counts'
export const settingCollection = 'settings'
export const inboxNotebook = 'Inbox'

// Pocketbase urls
export const baseURL = 'http://127.0.0.1:8090/api/files'
export const pbURL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
