<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Dialog from '$lib/components/ui/dialog/index';
	import type { Note } from '$lib/types';
	import { X } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { replacePbUrl } from '$lib/utils';

	type Props = {
		isOpen: boolean;
		action: (
			title: string,
			description: string,
			sources: Note['sources'],
			selectedThumbnailURL: string
		) => void;
		note: Note | undefined;
		thumbURL: string | undefined;
	};

	let { isOpen = $bindable(), action, note, thumbURL = '' }: Props = $props();

	let selectedThumbnailURL = $state<string>(thumbURL.split('?')[0]);
	let title = $state(note?.title ?? '');
	let description = $state(note?.description ?? '');
	let sources = $state(
		note?.sources ?? [
			{
				source: '',
				source_url: ''
			}
		]
	);

	function save() {
		action(title, description, sources, selectedThumbnailURL);
		isOpen = false;
	}

	$effect(() => {
		selectedThumbnailURL = thumbURL.split('?')[0];
		title = note?.title ?? '';
		description = note?.description ?? '';
		sources = note?.sources ?? [
			{
				source: '',
				source_url: ''
			}
		];
	});

	function handler(event: KeyboardEvent) {
		if (isOpen == false) return;

		switch (event.key) {
			case 'Enter':
				save();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handler);

		onDestroy(() => {
			document.removeEventListener('keydown', handler);
		});
	});
</script>

<Dialog.Root open={isOpen}>
	<Dialog.Content
		onCloseAutoFocus={(e) => {
			title = note?.title ?? '';
			description = note?.description ?? '';
			sources = note?.sources ?? [
				{
					source: '',
					source_url: ''
				}
			];
			e.preventDefault();
			isOpen = false;
		}}
		class="scrollbar-thin max-h-full max-w-5xl overflow-y-auto"
	>
		<Dialog.Header>
			<Dialog.Title>Edit Note</Dialog.Title>
		</Dialog.Header>

		<div class="">
			<legend class="fieldset-legend">Title</legend>
			<input type="text" class="input w-full" bind:value={title} />
		</div>

		<div class="">
			<legend class="fieldset-legend">Description</legend>
			<textarea class="textarea w-full" bind:value={description}></textarea>
		</div>

		<div>
			<legend class="fieldset-legend">Sources</legend>

			{#if sources}
				{#each sources as source, index}
					<div class="gap-golden-md flex items-center justify-center">
						<button
							onclick={() => {
								sources = sources?.toSpliced(index, 1);
							}}
							class="btn btn-xs btn-circle col-span-1 justify-self-end"><X size={14} /></button
						>
						<div class="gap-golden-md space-y-golden-md grid grid-cols-12 items-center">
							<input type="text" class="input col-span-2 my-2 w-full" bind:value={source.source} />

							<input
								type="text"
								class="input col-span-10 my-2 w-full"
								bind:value={source.source_url}
							/>
						</div>
					</div>
				{/each}

				<div class="flex justify-end">
					<button
						class="btn"
						onclick={() => {
							sources.push({
								source: '',
								source_url: ''
							});
						}}>Add Source</button
					>
				</div>
			{/if}
		</div>

		<div>
			<legend class="fieldset-legend">Change Thumbnail</legend>
			<ScrollArea class="card border-base-content/20 max-h-[350px] overflow-y-hidden border">
				<div class="gap-y-golden-xl m-golden-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{#if note && note.resources}
						{#each note.resources as resource}
							{#if resource.type.includes('image')}
								<label class="flex cursor-pointer items-center">
									<input
										type="radio"
										class="peer sr-only"
										value={resource.fileURL}
										bind:group={selectedThumbnailURL}
										name="thumbnail"
									/>

									<img
										class="peer-checked:border-primary border-base-200
										w-[200px] rounded-md border-4 transition-transform duration-100 ease-in-out peer-checked:scale-105"
										src="{replacePbUrl(resource.fileURL)}?thumb=200x0"
										alt=""
									/>
								</label>
							{/if}
						{/each}
						<label class="gap-golden-md flex cursor-pointer items-center">
							<input
								type="radio"
								class="peer sr-only"
								value=""
								bind:group={selectedThumbnailURL}
								name="thumbnail"
							/>
							<div
								class="peer-checked:border-primary border-base-100 bg-base-200 flex h-[200px] w-[200px] items-center justify-center
                                rounded-md border-4 transition-transform duration-150 ease-in-out peer-checked:scale-105"
							>
								No Thumbnail
							</div>
						</label>
					{/if}
				</div>
			</ScrollArea>
		</div>

		<div class="flex justify-end gap-x-2">
			<button onclick={() => (isOpen = false)} class="btn">Close</button>
			<button onclick={save} class="btn btn-primary">Save</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.scrollbar-thin::-webkit-scrollbar-button) {
		display: none;
		height: 0;
		width: 0;
	}
</style>
