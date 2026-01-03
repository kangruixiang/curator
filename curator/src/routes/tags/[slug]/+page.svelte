<script lang="ts">
	import { saveCurrentPage, signalPageState } from '$lib/utils.svelte';
	import { getNotelistState, setNotelistState, type NoteType } from '$lib/db.svelte';
	import { Pagination, NoteList, BulkToolbar, BulkEditBtn } from '$lib/components/';
	import * as Topbar from '$lib/components/Topbar/index';

	import { page } from '$app/state';

	let tagID = $derived(page.params.slug);
	let isBulkEdit = $state(false);
	let selectedNotesID = $state<string[]>([]);

	const noteType: NoteType = {
		type: 'tags',
		id: page.params.slug
	};

	setNotelistState(tagID, noteType);
	const notelistState = getNotelistState(tagID);

	const savedPage = $derived(signalPageState.savedPages.get(page.url.hash));

	const updatePage = async (newPage: number) => {
		await notelistState.getByTag(tagID, newPage);
		saveCurrentPage(newPage);
		notelistState.clickedPage = newPage;
	};

	let initialLoading = $state();

	$effect(() => {
		// console.log('Slug changed:', page.params.slug);
		notelistState.tagID = page.params.slug;
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
