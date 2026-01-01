import { env } from '$env/dynamic/public';

import { browser } from '$app/environment';

// Pocketbase login
export const superUser = 'admin@pocketbase.com';
export const superUserPass = 'amiodarone';

// Pocketbase collections
export const notebooksCollection = 'notebooks';
export const notesCollection = 'notes';
export const tagsCollection = 'tags';
export const viewTagsCollectionName = 'tags_with_note_counts';
export const viewNotesCollection = 'notes_without_content';
export const viewNotebooksCollection = 'notebooks_with_note_counts';
export const settingCollection = 'settings';
export const inboxNotebook = 'Inbox';

// Pocketbase urls
export const baseURL = 'http://127.0.0.1:8090/api/files';

const isDev = import.meta.env.DEV;
console.log('isDev:', isDev);
console.log('browser', browser);

// Determine the correct URL based on where the code is executing
export const pbURL = isDev
	? env.PUBLIC_POCKETBASE_URL // Browser sees localhost
	: browser
		? env.PUBLIC_POCKETBASE_URL
		: env.PUBLIC_INTERNAL_POCKETBASE_URL; // Server sees Docker name

console.log('pocketbase public:', env.PUBLIC_POCKETBASE_URL);
console.log('pocketbase internal', env.PUBLIC_INTERNAL_POCKETBASE_URL);

console.log('pbURL:', pbURL);
