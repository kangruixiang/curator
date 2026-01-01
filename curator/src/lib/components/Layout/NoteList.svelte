<script lang="ts">
	import { goto } from '$app/navigation';

	import * as ContextMenu from '$lib/components/ui/context-menu/index';

	import { Delete, EditNotebook, EditTags, NoteLoading, EditNote } from '$lib/components/';

	import type { NoteList, Note } from '$lib/types';
	import { getNoteState, setNoteState } from '$lib/db.svelte';
	import { replacePbUrl } from '$lib/utils';

	type Props = {
		isBulkEdit: boolean;
		notes: NoteList[];
		selectedNotesID: string[];
		update: () => void;
	};

	let { notes, isBulkEdit = false, selectedNotesID = $bindable(), update }: Props = $props();

	setNoteState('');
	const noteState = getNoteState('');
	let isDeleteOpen = $state(false);
	let isEditTagsOpen = $state(false);
	let isEditNotebookOpen = $state(false);
	let isEditNoteOpen = $state(false);

	function checkListNote(checkedNoteID: string) {
		if (selectedNotesID.includes(checkedNoteID)) {
			selectedNotesID = selectedNotesID.filter((noteID: string) => noteID != checkedNoteID);
			return;
		}
		selectedNotesID.push(checkedNoteID);
	}
</script>

{#snippet renderNotes(note: Note)}
	{#key note.thumbnail}
		<figure class="motion-opacity-in-0 motion-duration-300 w-full">
			<!-- {#if ['mp4', 'webm', 'ogg'].some((ext) => note.thumbnail.includes(ext))}
			<video style="width:100%" loop autoplay muted
				><source src={note.thumbnail} />Your browser does not support the video tag.</video
			>
		{:else} -->
			<img class="w-full" src={replacePbUrl(note.thumbnail)} alt="" />
			<!-- {/if} -->
		</figure>
	{/key}
	<div id="card-body" class="card-body p-golden-lg w-full">
		<div
			id="card-title"
			class="card-title overflow-hidden text-left text-pretty break-words text-ellipsis"
		>
			{note.title}
		</div>

		{#if !note.thumbnail}
			<p class="line-clamp-3 text-left text-pretty">
				{note.description}
			</p>
		{/if}
		<div class="gap-golden-sm flex flex-wrap items-center">
			{#if note.expand?.notebook}
				<span class="badge badge-soft rounded-sm">{note.expand?.notebook.name}</span>
			{/if}
			{#if note.expand?.tags}
				{#each note.expand?.tags as tag}
					<span class="badge text-nowrap">#{tag.name}</span>
				{/each}
			{/if}
		</div>
	</div>
{/snippet}

<svelte:boundary>
	<div
		class="p-golden-md md:p-golden-lg lg:p-golden-xl gap-golden-lg space-y-golden-lg lg:gap-golden-xl lg:space-y-golden-xl relative mb-80 columns-1 md:mb-64 md:columns-2 lg:mb-32 lg:columns-3 2xl:columns-4"
	>
		{#if notes.items.length > 0}
			{#each notes.items as note}
				<div class="group relative">
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<button
								class="{[
									selectedNotesID.includes(note.id) &&
										'bg-primary/50 hover:bg-primary/60 opacity-100',
									isBulkEdit ? 'opacity-70' : ''
								]} card motion-preset-fade motion-duration-200 hover:bg-base-200/70 bg-base-100 card-border w-full border hover:cursor-pointer"
								onclick={() => {
									if (isBulkEdit) {
										checkListNote(note.id);
										return;
									}
									goto(`/note/${note.id}`);
								}}
							>
								{@render renderNotes(note)}
							</button>
						</ContextMenu.Trigger>
						<ContextMenu.Content>
							<ContextMenu.Item
								onSelect={async () => {
									noteState.noteID = note.id;
									await noteState.getNote();
									isEditNoteOpen = true;
								}}>Edit</ContextMenu.Item
							>
							<ContextMenu.Item
								onSelect={async () => {
									noteState.noteID = note.id;
									await noteState.getNote();
									isEditNotebookOpen = true;
								}}>Edit Notebook</ContextMenu.Item
							>
							<ContextMenu.Item
								onSelect={async () => {
									noteState.noteID = note.id;
									await noteState.getNote();
									isEditTagsOpen = true;
								}}>Edit Tags</ContextMenu.Item
							>
							<ContextMenu.Item
								onSelect={async () => {
									noteState.noteID = note.id;
									await noteState.archiveNote();
									update();
								}}>Archive</ContextMenu.Item
							>
							<ContextMenu.Separator />
							<ContextMenu.Item
								onSelect={() => {
									noteState.noteID = note.id;
									isDeleteOpen = true;
								}}>Delete</ContextMenu.Item
							>
						</ContextMenu.Content>
					</ContextMenu.Root>
				</div>
			{/each}
		{:else}
			<NoteLoading />
		{/if}
	</div>

	{#snippet failed()}
		Notelist Failed to Render
	{/snippet}
</svelte:boundary>

<svelte:boundary>
	<!-- {#await noteState} -->
	<Delete
		bind:isOpen={isDeleteOpen}
		name="Note"
		action={async () => {
			await noteState.softDeleteNote();
			update();
		}}>this note</Delete
	>
	{#if noteState && noteState.note}
		<EditTags
			bind:isOpen={isEditTagsOpen}
			currentTags={noteState.note.expand?.tags}
			add={async (selectedTags) => {
				await noteState.addTag(selectedTags);
				update();
			}}
			remove={async (selectedTags) => {
				await noteState.removeTag(selectedTags);
				update();
			}}
		/>

		<EditNotebook
			currentNotebookID={noteState.note.expand?.notebook.id}
			bind:isOpen={isEditNotebookOpen}
			action={async (selectedNotebookID) => {
				await noteState.changeNotebook(selectedNotebookID);
				update();
			}}
		></EditNotebook>

		<EditNote
			note={noteState.note}
			thumbURL={noteState.note?.thumbnail}
			bind:isOpen={isEditNoteOpen}
			action={async (title, description, sources, selectedThumbnailURL) => {
				await noteState.changeTitle(title);
				await noteState.changeDescription(description);
				await noteState.changeSources(sources);
				await noteState.changeThumbnail(selectedThumbnailURL);
				await noteState.getNote();
				update();
			}}
		></EditNote>
	{/if}
	<!-- {/await} -->
	{#snippet failed()}
		Dialogs Failed to Render
	{/snippet}
</svelte:boundary>
