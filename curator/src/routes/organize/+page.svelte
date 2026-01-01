<script lang="ts">
	import * as Topbar from '$lib/components/Topbar/index';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Archive, Trash2 } from 'lucide-svelte';

	import { New, NotebookList, TagList, Pinned } from '$lib/components';
	import { getNotebookState, getTagState } from '$lib/db.svelte';
	import type { Notebook } from '$lib/types';

	const notebookState = getNotebookState();
	const tagState = getTagState();

	let isNewNotebookOpen = $state(false);
	let isNewTagOpen = $state(false);
</script>

{#snippet renderNotebook(notebook: Notebook, NotebookIcon)}
	<div class="flex w-full cursor-auto items-center justify-between px-2">
		<a
			href="#/notebook/{notebook.id}"
			class="badge hover:badge-neutral flex items-center text-nowrap transition-colors"
			><NotebookIcon size={18} />{notebook.name}
		</a>
		<span class="text-base-content/60">{notebook.note_count}</span>
	</div>
{/snippet}

<Topbar.Root>
	<Topbar.SidebarIcon></Topbar.SidebarIcon>
	<Topbar.Back />
	<div class="grow"></div>
</Topbar.Root>

<ScrollArea class="h-[calc(100vh-60px)]">
	<div class="p-golden-xl mx-auto max-w-5xl">
		<div class="flex items-center px-3">
			<h1 class="grow">Pinned</h1>
		</div>

		<div class="card p-golden-md">
			<Pinned />
		</div>

		<div class="divider"></div>

		<div class="flex items-center px-3">
			<h1 class="grow">Notebooks</h1>
			<button
				onclick={() => {
					isNewNotebookOpen = true;
				}}
				class="btn btn-sm md:btn-md">New</button
			>
		</div>

		<div class="card">
			<ul class="menu w-full">
				<NotebookList allowEdit={true} notebooks={notebookState.notebooks} />

				<li class="mr-4 ml-0 pl-0"><a href="#/archive"><Archive size={18} />Archive</a></li>

				<li class="mr-4 ml-0 pl-0"><a href="#/trash"><Trash2 size={18} />Trash</a></li>
			</ul>
		</div>

		<div class="divider"></div>

		<div class="flex items-center px-3">
			<h1 class="grow">Tags</h1>
			<button
				onclick={() => {
					isNewTagOpen = true;
				}}
				class="btn md:btn-md">New</button
			>
		</div>

		<ul class="menu w-full">
			<TagList allowEdit={true} tags={tagState.tags} />
		</ul>
	</div>
</ScrollArea>
<div class="mb-20"></div>

<New
	bind:isOpen={isNewTagOpen}
	newType="Tag"
	action={(newTagName) => tagState.createOnebyName(newTagName)}
/>

<New
	bind:isOpen={isNewNotebookOpen}
	newType="Notebook"
	action={(newNotebookName) => notebookState.createOnebyName(newNotebookName)}
/>
