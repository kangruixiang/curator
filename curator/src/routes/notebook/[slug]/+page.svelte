<script lang="ts">
	import { saveCurrentPage, signalPageState } from '$lib/utils.svelte';
	import { getNotelistState, setNotelistState, type NoteType } from '$lib/db.svelte';
	import { Pagination, NoteList, BulkToolbar, BulkEditBtn, Delete, Blank } from '$lib/components/';
	import * as Topbar from '$lib/components/Topbar/index';

	import { page } from '$app/state';

	let notebookID = $derived(page.params.slug);
	let isBulkEdit = $state(false);
	let isEmptyTrashOpen = $state(false);
	let selectedNotesID = $state<string[]>([]);

	const noteType: NoteType = {
		type: 'notebooks',
		id: page.params.slug
	};

	setNotelistState(notebookID, noteType);
	const notelistState = getNotelistState(notebookID);

	const savedPage = $derived(signalPageState.savedPages.get(page.url.hash) ?? 1);

	const updatePage = async (newPage: number) => {
		notelistState.clickedPage = newPage;
		await notelistState.getByNotebook(notebookID, newPage);
		saveCurrentPage(newPage);
	};

	let initialLoading = $state<Promise<void>>();

	$effect(() => {
		// console.log('Slug changed:', page.params.slug);
		notelistState.notebookID = page.params.slug;
		initialLoading = updatePage(savedPage);
	});
</script>

<Topbar.Root>
	<Topbar.SidebarIcon></Topbar.SidebarIcon>
	<Topbar.Back />
	<div class="grow"></div>
	<BulkEditBtn bind:isBulkEdit bind:selectedNotesID />
</Topbar.Root>

<div class="relative mb-20 h-[calc(100vh-60px)] overflow-y-auto">
	{#await initialLoading}
		<br />
	{:then}
		<Pagination
			currentPage={notelistState.notes.page}
			totalPages={notelistState.notes.totalPages}
			changePage={(newPage: number) => updatePage(newPage)}
		/>

		{#if notelistState.notes.totalItems > 0}
			<NoteList
				update={() => updatePage(notelistState.clickedPage)}
				{isBulkEdit}
				bind:selectedNotesID
				notes={notelistState.notes}
			/>
		{:else}
			<br />
		{/if}
		{#if isBulkEdit}
			<BulkToolbar
				updatePage={() => {
					updatePage(notelistState.clickedPage);
				}}
				bind:isBulkEdit
				bind:selectedNotesID
				{notelistState}
			/>
		{/if}
	{/await}
</div>
