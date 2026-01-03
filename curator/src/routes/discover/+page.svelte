<script lang="ts">
	import {
		NoteContent,
		Delete,
		EditNotebook,
		EditTags,
		Navbar,
		EditNote,
		FilterDiscover
	} from '$lib/components/';
	import { NoteState } from '$lib/db.svelte';
	import * as Topbar from '$lib/components/Topbar/index';
	import { onMount } from 'svelte';
	import { getMobileState } from '$lib/utils.svelte';
	import { getSearchState, SearchState, setSearchState } from './discover.svelte';

	const noteState = new NoteState('discovery');

	let note = $derived(noteState.note);
	const mobileState = getMobileState();
	let searchState = $state<SearchState>();
	setSearchState();

	let totalPages = $state(0);
	let currentPage = $state(1);
	let currentIndex = $state(0);
	let lastItemIndex = $state<number>(99);

	let isDeleteOpen = $state(false);
	let isEditTagsOpen = $state(false);
	let isEditNotebookOpen = $state(false);
	let isEditNoteOpen = $state(false);

	let isFilterSearch = $state(false);

	async function getNextNote() {
		if (currentIndex == lastItemIndex && currentPage == totalPages) return;
		currentIndex++;
		if (currentIndex == 30) {
			currentPage++;
			await noteState.getDiscoverNoteList(undefined, currentPage);
			currentIndex = 0;
		}
		// const start = performance.now();
		await noteState.getDiscoverNote(currentIndex);
		lastItemIndex = noteState.noteList.items.length - 1;
		// const end = performance.now();

		// console.log(`Discover page new note  in ${end - start} ms`);
	}

	async function getPreviousNote() {
		if (currentIndex == 0 && currentPage == 1) return;
		currentIndex--;
		if (currentIndex < 0 && currentPage > 1) {
			currentPage--;
			await noteState.getDiscoverNoteList(undefined, currentPage);
			currentIndex = 99;
		}
		await noteState.getDiscoverNote(currentIndex);
	}

	async function upvote() {
		await noteState.upvoteWeight();
		await getNextNote();
	}

	async function downvote() {
		await noteState.downvoteWeight();
		await getNextNote();
	}

	let initialLoading = $state();

	onMount(async () => {
		searchState = getSearchState();
		await noteState.getDiscoverNoteList();
		initialLoading = await noteState.getDiscoverNote(0);
		totalPages = noteState.noteList.totalPages;
	});
</script>

{#await initialLoading then}
	{#if note}
		<Topbar.Root>
			<Topbar.SidebarIcon></Topbar.SidebarIcon>
			{#if !mobileState.isMobile}
				<Topbar.NavBtns
					{currentIndex}
					{currentPage}
					{totalPages}
					{lastItemIndex}
					onLeft={getPreviousNote}
					onRight={getNextNote}
				></Topbar.NavBtns>
				<Topbar.Weight onUp={upvote} onDown={downvote}></Topbar.Weight>
			{/if}
			<Topbar.Filter bind:isOpen={isFilterSearch} />
			<!-- {note.score.toFixed(2)} -->
			<div class="hidden grow md:block"></div>

			{#if note?.expand?.tags}
				<Topbar.Tags tags={note.expand.tags} />
			{/if}
			<Topbar.TagBtn bind:isOpen={isEditTagsOpen} />
			{#if note?.expand?.notebook}
				<Topbar.Notebook bind:isOpen={isEditNotebookOpen} notebook={note.expand.notebook} />
			{/if}

			{#if !mobileState.isMobile}
				<Topbar.Rating
					rating={note.rating}
					action={(newRating) => {
						noteState.changeRating(newRating);
					}}
				/>
			{/if}
			<div class="divider divider-horizontal hidden md:flex"></div>

			<Topbar.Edit bind:isOpen={isEditNoteOpen} />

			<Topbar.Archive
				noteStatus={note.status}
				archive={() => {
					noteState.archiveNote();
					getNextNote();
				}}
				unarchive={() => {
					noteState.unArchiveNote();
					getNextNote();
				}}
			/>
			<Topbar.Delete noteStatus={note.status} bind:isOpen={isDeleteOpen} />
			<Topbar.Info {note} />
		</Topbar.Root>

		<div class="h-[calc(100vh-60px)]">
			{#key currentIndex}
				<NoteContent {noteState} />
			{/key}
		</div>

		<Navbar class="p-golden-md bg-base-100 flex flex-col items-end gap-y-2 rounded-md">
			<div class="flex flex-row gap-x-2">
				<Topbar.Weight onUp={upvote} onDown={downvote}></Topbar.Weight>
				<Topbar.NavBtns
					{currentIndex}
					{currentPage}
					{totalPages}
					{lastItemIndex}
					onLeft={getPreviousNote}
					onRight={getNextNote}
				></Topbar.NavBtns>
			</div>
			<Topbar.Rating
				rating={note.rating}
				action={(newRating) => {
					noteState.changeRating(newRating);
				}}
			/>
		</Navbar>
	{:else}
		<div class="grid h-screen place-items-center">
			<!-- <NoteLoading /> -->
			<br />
		</div>
	{/if}
{/await}

{#await initialLoading then}
	{#if note}
		<Delete
			bind:isOpen={isDeleteOpen}
			name="Note"
			action={() => {
				noteState.softDeleteNote();
				getNextNote();
			}}>this note</Delete
		>

		<EditNotebook
			currentNotebookID={note.expand?.notebook.id}
			bind:isOpen={isEditNotebookOpen}
			action={(selectedNotebookID) => {
				noteState.changeNotebook(selectedNotebookID);
			}}
		></EditNotebook>

		<EditTags
			bind:isOpen={isEditTagsOpen}
			currentTags={note.expand?.tags}
			add={(selectedTags) => noteState.addTag(selectedTags)}
			remove={(selectedTags) => noteState.removeTag(selectedTags)}
		/>

		<EditNote
			{note}
			thumbURL={note?.thumbnail}
			bind:isOpen={isEditNoteOpen}
			action={async (title, description, sources, selectedThumbnailURL) => {
				await noteState.changeTitle(title);
				await noteState.changeDescription(description);
				await noteState.changeSources(sources);
				await noteState.changeThumbnail(selectedThumbnailURL);
				await noteState.getNote();
			}}
		></EditNote>
	{/if}
{/await}

<FilterDiscover
	bind:isOpen={isFilterSearch}
	search={async (customFilters) => {
		await noteState.getDiscoverNoteList(customFilters, 1);
		await noteState.getDiscoverNote(0);
	}}
/>
