import { PUBLIC_POCKETBASE_URL, PUBLIC_INTERNAL_POCKETBASE_URL } from '$env/static/public';

import { browser } from '$app/environment';

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

const isDev = import.meta.env.DEV

// Determine the correct URL based on where the code is executing
export const pbURL = isDev
    ? PUBLIC_POCKETBASE_URL  // Browser sees localhost
    : browser ?
        PUBLIC_POCKETBASE_URL :
        PUBLIC_INTERNAL_POCKETBASE_URL // Server sees Docker name
