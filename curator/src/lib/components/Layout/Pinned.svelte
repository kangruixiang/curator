<script lang="ts">
	import { page } from '$app/state';
	import * as ContextMenu from '$lib/components/ui/context-menu/index';
	import { getNotebookState, getTagState } from '$lib/db.svelte';
	import type { Tag, Notebook } from '$lib/types';

	import { Tag as TagIcon, Pin } from 'lucide-svelte';

	const tagState = getTagState();
	const notebookState = getNotebookState();

	const tags = $derived(tagState.pinnedTags);
	const notebooks = $derived(notebookState.pinnedNotebooks);
</script>

{#snippet renderNotebook(notebook: Notebook)}
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			class="{page.url.hash == `/notebook/${notebook.id}` ? ' bg-neutral text-neutral-content' : ''} my-1
			flex cursor-auto items-center justify-between rounded-md p-0 pr-1" >
			<div class=" flex w-full items-center justify-between">
				<a href="/notebook/{notebook.id}" class="w-full px-3 py-1 text-nowrap">
					{notebook.name}
				</a>
				<Pin size={15} />
			</div>
		</ContextMenu.Trigger>
		<ContextMenu.Content>
			<ContextMenu.Item
				onSelect={() => {
					notebookState.unpin(notebook.id);
				}}>Unpin</ContextMenu.Item
			>
		</ContextMenu.Content>
	</ContextMenu.Root>
{/snippet}

{#snippet renderTag(tag: Tag)}
	<ContextMenu.Root>
		<ContextMenu.Trigger
			class="motion-translate-y-in-50 motion-duration-200 flex cursor-auto items-center justify-between p-0 pr-1"
		>
			<a
				href="/tags/{tag.id}"
				class="{page.url.hash == `/tags/${tag.id}`
					? 'badge-neutral'
					: ''} badge hover:badge-neutral mx-0 my-1 flex items-center gap-x-2 text-nowrap transition-colors"
			>
				<TagIcon size={15} />{tag.name}
			</a>
			<Pin size={15} />
		</ContextMenu.Trigger>
		<ContextMenu.Content>
			<ContextMenu.Item
				onSelect={() => {
					tagState.unpin(tag.id);
				}}>Unpin</ContextMenu.Item
			>
		</ContextMenu.Content>
	</ContextMenu.Root>
{/snippet}

{#if notebooks.length > 0 || tags.length > 0}
	<div
		class="bg-base-300/40 p-golden-sm px-golden-md motion-scale-in-50 motion-opacity-in-0 motion-duration-200 motion-ease-spring-bouncier mr-4 rounded-md"
	>
		<ul class="">
			{#each notebooks as notebook}
				<li class="motion-translate-y-in-50 motion-duration-200">
					{@render renderNotebook(notebook)}
				</li>
			{/each}

			{#each tags as tag}
				{@render renderTag(tag)}
			{/each}
		</ul>
	</div>
{/if}
