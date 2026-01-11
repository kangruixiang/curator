import PocketBase, { type RecordModel } from 'pocketbase';

import { getContext, setContext } from 'svelte';

import {
	type Notebook,
	type Tag,
	type Note,
	type NoteRecord,
	type PError,
	type Setting,
	type NoteType
} from './types';

import { tryCatch } from './utils.svelte';
import {
	superUser,
	superUserPass,
	notebooksCollection,
	notesCollection,
	tagsCollection,
	viewTagsCollectionName,
	viewNotesCollection,
	viewNotebooksCollection,
	settingCollection,
	inboxNotebook,
	pbURL,
	baseURL
} from './const';
import {
	addThumbnailToRecord,
	createMergedNoteData,
	createNewResources,
	getContentBeforeMerge,
	mergeContents
} from './utils';

const pb = new PocketBase(pbURL);

const re = new RegExp('/api/collections/[^/]+/records');
pb.beforeSend = (url, options) => {
	if (re.test(url) && options.method === 'GET') {
		url += '/fts';
	}
	return { url, options };
};

export async function getAuth() {
	await pb.collection('_superusers').authWithPassword(superUser, superUserPass);
	console.log('Logged in to Pocket client: ', pb.authStore.isValid);
}

export async function makeDefaultNotebook() {
	const { data, error } = await tryCatch<RecordModel, PError>(
		pb.collection(notebooksCollection).create({ name: inboxNotebook })
	);

	if (error) {
		if (error.data.data.name.code == 'validation_not_unique') {
			console.log('Inbox already exists');
		} else {
			console.error('Error making Inbox: ', error.message);
		}
	}
}

export async function addFtsCollection() {
	const collectionData = {
		collection: 'notes',
		tokenizer: 'porter'
	};

	const { data, error } = await tryCatch<RecordModel, PError>(
		pb.collection('_fts').create(collectionData)
	);

	if (error) {
		if (error.data.data.collection.code == 'validation_not_unique') {
			console.log('Fts already exists');
			return;
		} else {
			console.error('Error making fts: ', error.message);
			return;
		}
	}

	console.log('FTS collection added');
}

export async function uploadFileToPocketbase(recordID: string, file: File) {
	// upload to database
	const { data: record, error } = await tryCatch<RecordModel, PError>(
		pb.collection(notesCollection).update(recordID, {
			'attachments+': [file]
		})
	);

	if (error) {
		console.error('Error uploading file: ', error.message, error.data);
		return '';
	}

	return `${baseURL}\/${notesCollection}\/${recordID}\/${record.attachments.at(-1)}`;
}

export class TagState {
	tags = $state<Tag[]>([]);
	flatTags = $state<Tag[]>([]);
	pinnedTags = $state<Tag[]>([]);

	constructor() {
		$effect(() => {
			this.getAll();
			pb.collection(notesCollection).subscribe('*', async () => {
				this.getAll();
			});
		});
	}

	async getAll() {
		// const start = performance.now()
		const { data: records, error } = await tryCatch(
			pb.collection(viewTagsCollectionName).getFullList({
				sort: 'name',
				expand: 'parent'
			})
		);

		if (error) {
			console.error('Error while getting all tags: ', error.message);
		}

		if (!records) {
			return;
		}
		// const mid = performance.now()
		// console.log(`after db: ${mid - start} ms`)

		this.flatTags = records;
		this.pinnedTags = [];

		const tagMap = new Map();
		records.forEach((tag) => {
			tagMap.set(tag.id, { ...tag, children: [] });
			if (tag.status === 'pinned') {
				this.pinnedTags.push(tag);
			}
		});

		let rootTags: Tag[] = [];
		tagMap.forEach((tag) => {
			if (tag.expand.parent) {
				const parent = tagMap.get(tag.expand.parent.id);
				parent.children.push(tag);
			} else {
				rootTags.push(tag);
			}
		});

		// const end = performance.now()
		// console.log('tags updated in: ', end - start, 'ms')
		this.tags = rootTags;
	}

	async delete(recordID: string) {
		const { data, error } = await tryCatch(pb.collection(tagsCollection).delete(recordID));

		if (error) {
			console.error('Error while deleting tag: ', error);
		}

		await this.getAll();
	}

	async getOne(tagID: string) {
		const { data, error } = await tryCatch(pb.collection(tagsCollection).getOne(tagID));

		if (error) {
			console.error('Error getting tag: ', error);
		}

		return data;
	}

	async createOnebyName(newName: string, parentTagID?: string) {
		const { data, error } = await tryCatch(
			pb.collection(tagsCollection).create({
				name: newName,
				parent: parentTagID
			})
		);
		if (error) {
			console.error('Error while creating new tag: ', error.data);
		}
		await this.getAll();
		return data;
	}

	async updateOnebyName(recordID: string, newName: string) {
		const { data, error } = await tryCatch(
			pb.collection(tagsCollection).update(recordID, {
				name: newName
			})
		);
		if (error) {
			console.error('Error while updating tag name: ', error.message, error.data);
		}
		await this.getAll();
	}

	async updateOnebyParent(recordID: string, parentTagID: string) {
		const { data, error } = await tryCatch(
			pb.collection(tagsCollection).update(recordID, {
				parent: parentTagID
			})
		);
		if (error) {
			console.error('Error while updating parent tag: ', error.message);
		}
		await this.getAll();
	}

	async pin(recordID: string) {
		const { data, error } = await tryCatch(
			pb.collection(tagsCollection).update(recordID, {
				status: 'pinned'
			})
		);
		if (error) {
			console.error('Error pinning tag: ', error.message, error.data);
		}
		await this.getAll();
	}

	async unpin(recordID: string) {
		const { data, error } = await tryCatch(
			pb.collection(tagsCollection).update(recordID, {
				status: ''
			})
		);
		if (error) {
			console.error('Error unpin tag: ', error.message, error.data);
		}
		await this.getAll();
	}
}

export class NotebookState {
	inbox = $state<Note>();
	inboxID = $state<string>('');
	inboxCount = $state(0);
	totalNoteCount = $state(0);
	notebooks = $state<Notebook[]>([]);
	flatNotebooks = $state<Notebook[]>([]);
	pinnedNotebooks = $state<Notebook[]>([]);

	constructor() {
		$effect(() => {
			this.getAll();
			pb.collection(notebooksCollection).subscribe('*', async () => {
				this.getAll();
				this.getInbox();
				this.getAllCounts();
			});
			pb.collection(notesCollection).subscribe('*', async () => {
				this.getAll();
				this.getInbox();
				this.getAllCounts();
			});
		});
	}

	async getAll() {
		// const start = performance.now()
		const { data: records, error } = await tryCatch(
			pb.collection(viewNotebooksCollection).getFullList({
				sort: 'name',
				// filter: 'name != "Inbox"',
				expand: 'parent'
			})
		);

		if (error) {
			console.error('Error while get all notebooks: ', error.message);
		}

		if (!records) {
			return;
		}

		this.flatNotebooks = records;
		this.pinnedNotebooks = [];

		const notebookMap = new Map();
		records.forEach((notebook) => {
			notebookMap.set(notebook.id, { ...notebook, children: [] });
			if (notebook.status === 'pinned') {
				this.pinnedNotebooks.push(notebook);
			}
		});

		let rootNotebooks: Notebook[] = [];
		notebookMap.forEach((notebook) => {
			if (notebook.expand.parent) {
				const parent = notebookMap.get(notebook.expand.parent.id);
				parent.children.push(notebook);
			} else {
				rootNotebooks.push(notebook);
			}
		});
		// const end = performance.now()
		// console.log(`notebooks in ${end - start} ms`)
		this.notebooks = rootNotebooks;
	}

	async getInbox() {
		const { data: inbox, error } = await tryCatch(
			pb.collection(viewNotebooksCollection).getFirstListItem(`name="Inbox"`)
		);

		if (error) {
			console.error('Error while getting inbox: ', error.message);
		}

		if (!inbox) {
			return;
		}

		this.inbox = inbox;
		this.inboxID = inbox.id;
		this.inboxCount = inbox.note_count;
		return inbox;
	}

	async getAllCounts() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).getList(1, 1, {
				filter: `status="active"`
			})
		);

		if (error) {
			console.error('Error while getting all notebooks: ', error.message);
		}

		this.totalNoteCount = data.totalItems;
	}

	async createOnebyName(newName: string, parentNotebookID?: string) {
		const { data, error } = await tryCatch(
			pb.collection(notebooksCollection).create({
				name: newName,
				parent: parentNotebookID
			})
		);
		if (error) {
			console.error('Error while creating new notebook: ', error.data, error.message);
		}
	}

	async getOneByName(notebookName: string) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotebooksCollection).getFirstListItem(`name="${notebookName}"`)
		);

		if (error) {
			console.error('Error while get notebook: ', notebookName, error.data);
		}
		return data;
	}

	async delete(recordID: string) {
		const { data: recordsToMove, error: errorsToMove } = await tryCatch(
			pb.collection(viewNotesCollection).getFullList({
				filter: `notebook = '${recordID}'`
			})
		);

		if (errorsToMove) {
			console.error('Error getting records to move: ', errorsToMove);
			return;
		}

		if (!this.inbox) {
			await this.getInbox();
		}

		for (const record of recordsToMove) {
			const { data: recordToMove, error: errorToMove } = await tryCatch(
				pb.collection(notesCollection).update(record.id, {
					notebook: this.inboxID
				})
			);

			if (errorToMove) {
				console.error('Error moving record: ', errorToMove.message);
				continue;
			}
		}

		const { data, error } = await tryCatch(pb.collection(notebooksCollection).delete(recordID));

		if (error) {
			console.error('Error while deleting notebook: ', error);
		}
	}

	async updateOnebyName(recordID: string, newName: string) {
		const { data, error } = await tryCatch(
			pb.collection(notebooksCollection).update(recordID, {
				name: newName
			})
		);
		if (error) {
			console.error('Error while updating notebook name: ', error);
		}
		// await this.getAll()
	}

	async updateOnebyParent(recordID: string, parentNotebook: string) {
		const { data, error } = await tryCatch(
			pb.collection(notebooksCollection).update(recordID, {
				parent: parentNotebook
			})
		);
		if (error) {
			console.error('Error while updating parent notebook: ', error);
		}
		// await this.getAll()
	}

	async pin(recordID: string) {
		const { data, error } = await tryCatch(
			pb.collection(notebooksCollection).update(recordID, {
				status: 'pinned'
			})
		);
		if (error) {
			console.error('Error pinning notebook: ', error.data);
		}
	}

	async unpin(recordID: string) {
		const { data, error } = await tryCatch(
			pb.collection(notebooksCollection).update(recordID, {
				status: ''
			})
		);
		if (error) {
			console.error('Error unpinning notebook: ', error.data);
		}
	}
}

export class NotelistState {
	notes = $state<NoteRecord>({
		items: [],
		page: 1,
		perPage: 25,
		totalItems: 0,
		totalPages: 0
	});
	clickedPage = 1;
	notebookID = $state<string>();
	notebookName = $state<string>();
	tagID = $state<string>();
	noteType = $state<NoteType['type']>();
	tags = $state<Tag[]>();

	constructor(noteType: NoteType) {
		this.noteType = noteType.type;
		if (this.noteType == 'notebooks') {
			this.notebookID = noteType.id;
		} else if (this.noteType == 'tags') {
			this.tagID = noteType.id;
		}
	}

	async getDefault(newPage: number) {
		if (this.noteType === 'default') {
			this.getByPage(newPage);
		} else if (this.noteType === 'notebooks') {
			this.getByNotebook(this.notebookID, newPage);
		} else if (this.noteType === 'tags') {
			this.getByTag(this.tagID, newPage);
		} else if (this.noteType === 'archive') {
			this.getArchived(newPage);
		} else if (this.noteType === 'trash') {
			this.getDeleted(newPage);
		}
	}

	async getCurrentNotebook(notebookID: string) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotebooksCollection).getOne(notebookID)
		);

		if (error) {
			console.error('Error getting notebook: ', error);
		}
		return data;
	}

	async getByPage(newPage = 1) {
		const start = performance.now();

		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(newPage, 24, {
				sort: '-created',
				filter: `status="active"`,
				expand: 'notebook, tags'
			})
		);

		if (error) {
			console.error('Unable to get notes by page ', error.message);
		}

		const end = performance.now();
		console.log(`Default notes seen in ${end - start} ms`);

		this.notes = data;
		return this.notes;
	}

	async getByNotebook(notebookID: string, page: number) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(page, 24, {
				filter: `notebook="${notebookID}" && status="active"`,
				expand: 'tags,notebook',
				sort: '-created'
			})
		);

		if (error) {
			console.error('Error getting notes: ', error);
		}
		this.notes = data;
		return this.notes;
	}

	async getArchived(page: number) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(page, 24, {
				filter: `status="archived"`,
				expand: 'tags,notebook',
				sort: '-created'
			})
		);

		if (error) {
			console.error('Error getting notes: ', error);
		}
		this.notes = data;
		return this.notes;
	}

	async getDeleted(page: number) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(page, 24, {
				filter: `status="deleted"`,
				expand: 'tags,notebook',
				sort: '-created'
			})
		);

		if (error) {
			console.error('Error getting notes: ', error);
		}
		this.notes = data;
		return this.notes;
	}

	async getByTag(tagID: string, page: number) {
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(page, 24, {
				filter: `tags~"${tagID}" && status="active"`,
				expand: 'tags,notebook',
				sort: '-created'
			})
		);

		if (error) {
			console.error('Error getting notes: ', error);
		}
		this.notes = data;
		return this.notes;
	}

	async getByFilter(customFilters: string, page: number) {
		const start = performance.now();
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).getList(page, 24, {
				sort: '-created',
				expand: 'tags,notebook',
				filter: customFilters
			})
		);

		if (error) {
			console.error('Unable to get notes by filter ', error.message);
			return;
		}
		const end = performance.now();
		console.log(`search complete in ${end - start} ms`);

		this.notes = data;
		return this.notes;
	}

	async getOneByName() {
		return await pb.collection(notesCollection).getFirstListItem(`name='${name}'`);
	}

	async emptyTrash() {
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getFullList({
				filter: `status="deleted"`
			})
		);

		if (error) {
			console.error('Unable to get deleted notes: ', error);
		}

		if (!data) return;

		await Promise.all(
			data.map((note) => {
				pb.collection(notesCollection).delete(note.id);
			})
		);
	}

	async softDeleteMultiple(recordIDs: string[]) {
		await Promise.all(
			recordIDs.map(async (recordID) => {
				const { data, error } = await pb.collection(notesCollection).update(recordID, {
					status: 'deleted'
				});

				if (error) {
					console.error('Unable to delete note: ', error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async unSoftDeleteMultiple(recordIDs: string[]) {
		await Promise.all(
			recordIDs.map(async (recordID) => {
				const { data, error } = await pb.collection(notesCollection).update(recordID, {
					status: 'active'
				});

				if (error) {
					console.error('Unable to restore deleted note: ', error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async archiveMultiple(recordIDs: string[]) {
		await Promise.all(
			recordIDs.map(async (recordID) => {
				const { data, error } = await pb.collection(notesCollection).update(recordID, {
					status: 'archived'
				});

				if (error) {
					console.error('Unable to archive note: ', error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async unArchiveMultiple(recordIDs: string[]) {
		await Promise.all(
			recordIDs.map(async (recordID) => {
				const { data, error } = await pb.collection(notesCollection).update(recordID, {
					status: 'active'
				});

				if (error) {
					console.error('Unable to un-archive note: ', error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async changeNotebook(selectedNotesID: string[], newNotebookID: string) {
		await Promise.all(
			selectedNotesID.map(async (noteID) => {
				const { data, error } = await tryCatch(
					pb.collection(notesCollection).update(noteID, {
						notebook: newNotebookID
					})
				);
				if (error) {
					console.error('Error changing notebook: ', noteID, error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async addTag(selectedNotesID: string[], selectedTagID: string) {
		await Promise.all(
			selectedNotesID.map(async (noteID) => {
				const { data, error } = await tryCatch(
					pb.collection(notesCollection).update(noteID, {
						'tags+': selectedTagID
					})
				);
				if (error) {
					console.error('Error adding tag: ', noteID, error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async removeTag(selectedNotesID: string[], selectedTagID: string) {
		await Promise.all(
			selectedNotesID.map(async (noteID) => {
				const { data, error } = await tryCatch(
					pb.collection(notesCollection).update(noteID, {
						'tags-': selectedTagID
					})
				);
				if (error) {
					console.error('Error removing tag: ', noteID, error);
				}
			})
		);
	}

	async clearTags(selectedNotesID: string[]) {
		await Promise.all(
			selectedNotesID.map(async (noteID) => {
				const { data, error } = await tryCatch(
					pb.collection(notesCollection).update(noteID, {
						tags: []
					})
				);
				if (error) {
					console.error('Error clearing tags: ', noteID, error);
				}
			})
		);
		// await this.getDefault(this.clickedPage)
	}

	async mergeNotes(selectedNotesID: string[]) {
		let selectedNotes = [];

		for (const selectedNoteID of selectedNotesID) {
			const { data: selectedNote, error: selectedNoteError } = await tryCatch(
				pb.collection(notesCollection).getOne(selectedNoteID)
			);

			if (selectedNoteError) {
				console.error('Error getting notes to merge: ', selectedNoteError.message);
				continue;
			}
			selectedNotes.push(selectedNote);
		}

		if (!selectedNotes || selectedNotes.length < 2) return;

		const [baseNote, ...restNotes] = selectedNotes;
		const newResources = await createNewResources(baseNote.id, restNotes);
		const mergedNoteData = createMergedNoteData(selectedNotes, newResources);

		const { data: finalNote, error: finalNoteError } = await tryCatch(
			pb.collection(notesCollection).update(baseNote.id, mergedNoteData)
		);

		if (finalNoteError) {
			console.error('Error updating final merged note: ', finalNoteError.data);
		}

		// create new thumbnail if doesn't have one
		if (!baseNote.thumbnail) {
			try {
				const thumbResource = getResourceThumbURL(finalNote.resources);
				await addThumbnailToRecord(baseNote.id, thumbResource?.fileURL);
			} catch (e) {
				console.log(e);
			}
		}

		await Promise.all(
			selectedNotes.slice(1).map((n) =>
				pb.collection(notesCollection).update(n.id, {
					status: 'deleted'
				})
			)
		);
	}
}

export class NoteState {
	note = $state<Note>();
	noteList = $state();
	noteID: string;
	fontScale = $state(1);

	constructor(noteID: string) {
		this.noteID = noteID;
	}

	get customStyles() {
		return `
            :root {
                  --color-base-100: oklch(100% 0 0);
                  --color-base-content: oklch(27.807% 0.029 256.847);
              }
              @media (prefers-color-scheme: dark) {
                :root {
                      --color-base-100: oklch(25.33% 0.016 252.42);
                      --color-base-content: oklch(97.807% 0.029 256.847); 
               }
            }
              html, body {
                  margin: 0 !important;
                  height: 100% !important;
              }
              * {
                  font-size: ${this.fontScale * 100}% !important;
                  line-height: 1.4 !important;
             }
              html, body, main, section, p, pre, div {
                  background-color: var(--color-base-100) !important;
                  background: var(--color-base-100) !important; 
                  color: var(--color-base-content) !important;
              }
              img {
                  max-width: 100% !important;
                  height: auto !important;
              }
              .img-wrapper {
                  display: flex;
                  justify-content: center;
                  margin-bottom: 1rem;
              }
              video {
                  max-height: 800px; !important;
              }
              `;
	}

	async getNote() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).getOne(this.noteID, {
				expand: 'notebook,tags'
			})
		);

		if (error) {
			console.error('Error getting note: ', this.noteID, error);
			return null;
		}
		this.note = data;
		return data;
	}

	async getDiscoverNoteList(filter: string = `status="active"`, page = 1) {
		// const start = performance.now();
		const { data, error } = await tryCatch(
			pb.collection(viewNotesCollection).getList(page, 30, {
				sort: '-score',
				filter: filter
			})
		);

		if (error) {
			console.error('Error getting discover note: ', error.data);
		}
		// const end = performance.now();
		// console.log(`Returned Discover List in ${end - start} ms`);

		this.noteList = data;
		return data;
	}

	async getDiscoverNote(index = 0) {
		// const start3 = performance.now();
		this.noteID = this.noteList.items[index].id;

		// const start = performance.now();
		const { data: record, error: recordError } = await tryCatch(
			pb.collection(notesCollection).getFirstListItem(`id="${this.noteID}"`, {
				expand: 'notebook,tags'
			})
		);
		// const end = performance.now();

		// console.log(`Fetched new note  in ${end - start} ms`);

		if (recordError) {
			console.error('Error getting discover note: ', recordError.data);
		}

		if (!record) {
			console.log('No discovery note found');
		}

		// const start2 = performance.now();
		this.note = record;

		this.updateLastOpened();
		// const end2 = performance.now();
		// console.log(`Updated this.note  in ${end2 - start2} ms`);
		// const end3 = performance.now();
		// console.log(`Discover function  in ${end3 - start3} ms`);
	}

	async updateLastOpened() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				last_opened: new Date()
			})
		);

		if (error) {
			console.error('Error updating note last opened date: ', error.message);
		}
	}

	async deleteNote() {
		const { data, error } = await tryCatch(pb.collection(notesCollection).delete(this.noteID));
		if (error) {
			console.error('Error deleting note: ', this.noteID, error);
		}
	}

	async softDeleteNote() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				status: 'deleted'
			})
		);

		if (error) {
			console.error('Unable to delete note: ', error);
		}
	}

	async changeNotebook(newNotebookID: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				notebook: newNotebookID
			})
		);
		if (error) {
			console.error('Error changing notebook: ', this.noteID, error);
		}
		await this.getNote();
		return data;
	}

	async changeTags(selectedTags: string[]) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				tags: selectedTags
			})
		);
		if (error) {
			console.error('Error changing tags: ', this.noteID, error);
		}
		await this.getNote();
		// return data
	}

	async addTag(selectedTagID: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				'tags+': selectedTagID
			})
		);
		if (error) {
			console.error('Error adding tag: ', this.noteID, error);
		}
		await this.getNote();
	}

	async removeTag(selectedTagID: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				'tags-': selectedTagID
			})
		);
		if (error) {
			console.error('Error removing tag: ', this.noteID, error);
		}
		await this.getNote();
	}

	async changeRating(newRating: number) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				rating: newRating
			})
		);
		if (error) {
			console.error('Error changing rating: ', this.noteID, error.message);
		}
		await this.getNote();
		return data;
	}

	async upvoteWeight() {
		const newWeight = this.note.weight + 1;

		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				weight: newWeight
			})
		);
		if (error) {
			console.error('Error changing weight: ', this.noteID, error.message);
		}
		await this.getNote();
		return data;
	}

	async downvoteWeight() {
		const newWeight = this.note.weight - 1;

		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				weight: newWeight
			})
		);
		if (error) {
			console.error('Error changing weight: ', this.noteID, error.message);
		}
		await this.getNote();
		return data;
	}

	async archiveNote() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				status: 'archived'
			})
		);

		if (error) {
			console.error('Error archiving note: ', error.message);
		}
	}

	async restoreNote() {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				status: 'active'
			})
		);

		if (error) {
			console.error('Error restoring note: ', error.message);
		}

		await this.getNote();
		return data;
	}

	async permaDeleteNote() {
		const { data, error } = await tryCatch(pb.collection(notesCollection).delete(this.noteID));

		if (error) {
			console.error('Error deleting note: ', error.message);
		}
	}

	async changeTitle(newTitle: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				title: newTitle
			})
		);

		if (error) {
			console.error('Error changing note title: ', error.message);
		}
	}

	async changeDescription(newDescription: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				description: newDescription
			})
		);

		if (error) {
			console.error('Error changing note description: ', error.message);
		}
	}

	async changeSources(newSources: Note['sources'] | undefined) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				sources: newSources,
				expand: 'notebook,tags'
			})
		);

		if (error) {
			console.error('Error changing note sources: ', error.message);
		}
	}

	async changeThumbnail(url: string) {
		const thumbURL = url ? `${url}?thumb=500x0` : '';

		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(this.noteID, {
				thumbnail: thumbURL
			})
		);

		if (error) {
			console.error('Error changing note thumbnail: ', error.message);
		}
	}

	async updateContent(newContent: string) {
		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(
				this.noteID,
				{
					content: newContent
				},
				{
					expand: 'notebook,tags'
				}
			)
		);

		if (error) {
			console.error('Error updating note content: ', error.message);
		}

		this.note = data;
	}

	async appendContent(newContent: string) {
		const { data: record, error: recordError } = await tryCatch(
			pb.collection(notesCollection).getOne(this.noteID)
		);

		if (recordError) {
			console.error('Error getting note content: ', recordError.message);
			return;
		}

		const contentList = [record.content, newContent];
		const mergedContent = mergeContents(contentList);

		const { data, error } = await tryCatch(
			pb.collection(notesCollection).update(
				this.note.id,
				{
					content: mergedContent
				},
				{
					expand: 'notebook,tags'
				}
			)
		);

		if (error) {
			console.error('Error updating note content: ', error.message);
		}
		this.note = data;
	}
}

export class settingState {
	ratingWeight = $state<number>();
	recencyWeight = $state<number>();
	weightWeight = $state<number>();
	randomWeight = $state<number>();
	fullPenaltyWindow = $state<number>();
	decayWindow = $state<number>();
	maxDay = $state<number>();
	daysOld = $state<number>();
	scoreRefreshHour = $state<number>();
	youtubeAPIKey = $state<string>();

	async makeDefaultValue<T extends string | number>(name: string, defaultValue: T) {
		const { data, error } = await tryCatch<Setting, PError>(
			pb.collection(settingCollection).create({
				name: name,
				value: defaultValue
			})
		);

		if (error) {
			console.error('Error making setting: ', name, error.message);
			return;
		}

		if (!data) return;

		return data.value as T;
	}

	async changeSetting<T extends number | string>(name: string, newValue: T) {
		const { data: settingRecord, error } = await tryCatch<Setting, PError>(
			pb.collection(settingCollection).getFirstListItem(`name="${name}"`)
		);

		if (error || !settingRecord) {
			console.error('Error getting setting: ', name, error.message);
			return;
		}

		const { data: settingUpdate, error: errorUpdate } = await tryCatch<Setting, PError>(
			pb.collection(settingCollection).update(settingRecord.id, {
				value: newValue
			})
		);

		if (errorUpdate || !settingUpdate) {
			console.error('Error making setting: ', name, errorUpdate.message);
			return;
		}

		return settingUpdate.value;
	}

	async getSetting<T extends string | number>(name: string, defaultValue: T) {
		const { data, error } = await tryCatch<Setting, PError>(
			pb.collection(settingCollection).getFirstListItem(`name="${name}"`)
		);

		if (error || !data) {
			console.error('Error getting setting: ', name, error.message);
			const newSettingValue = await this.makeDefaultValue(name, defaultValue);
			return newSettingValue;
		}

		return data.value as T;
	}

	async getDefaultSettings() {
		this.ratingWeight = await this.getSetting('ratingWeight', 0.3);
		this.recencyWeight = await this.getSetting('recencyWeight', 0.3);
		this.weightWeight = await this.getSetting('weightWeight', 0.3);
		this.randomWeight = await this.getSetting('randomWeight', 0.3);
		this.maxDay = await this.getSetting('maxDay', 60);
		this.fullPenaltyWindow = await this.getSetting('fullPenaltyWindow', 1);
		this.decayWindow = await this.getSetting('decayWindow', 12);
		this.daysOld = await this.getSetting('daysOld', 0);
		this.scoreRefreshHour = await this.getSetting('scoreRefreshHour', 6);
		this.youtubeAPIKey = await this.getSetting('youtubeAPIKey', '');
	}
}

export default pb;

const TAG_KEY = Symbol('TAG');
const NOTEBOOK_KEY = Symbol('NOTEBOOK');
const INBOX_KEY = Symbol('INBOX');
const SETTING_KEY = Symbol('SETTING');

export function setTagState() {
	return setContext(TAG_KEY, new TagState());
}

export function getTagState() {
	return getContext<ReturnType<typeof setTagState>>(TAG_KEY);
}

export function setNotebookState() {
	return setContext(NOTEBOOK_KEY, new NotebookState());
}

export function getNotebookState() {
	return getContext<ReturnType<typeof setNotebookState>>(NOTEBOOK_KEY);
}

export function setNotelistState(NOTE_KEY: string, noteType: NoteType) {
	return setContext(NOTE_KEY, new NotelistState(noteType));
}

export function getNotelistState(NOTE_KEY: string) {
	return getContext<ReturnType<typeof setNotelistState>>(NOTE_KEY);
}

export function setNoteState(NOTE_KEY: string) {
	return setContext(NOTE_KEY, new NoteState(NOTE_KEY));
}

export function getNoteState(NOTE_KEY: string) {
	return getContext<ReturnType<typeof setNoteState>>(NOTE_KEY);
}

export function setSettingState() {
	return setContext(SETTING_KEY, new settingState());
}

export function getSettingState() {
	return getContext<ReturnType<typeof setSettingState>>(SETTING_KEY);
}
