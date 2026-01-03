<script lang="ts">
	import { onMount } from 'svelte';

	import * as Dialog from '$lib/components/ui/dialog/index';

	import { SelectTags, SelectNotebook } from '$lib/components/index';
	import { getNotebookState, getTagState } from '$lib/db.svelte';
	import { getSearchState, type SearchState } from './discover.svelte';

	type Props = {
		isOpen: boolean;
		search: (customFilter: string) => void;
	};

	let { isOpen = $bindable(), search }: Props = $props();

	let searchState = $state<SearchState>();

	const notebookState = getNotebookState();
	const tagState = getTagState();

	const notebooks = $derived(notebookState.flatNotebooks);
	const tags = $derived(tagState.flatTags);

	let filterNotebookID = $state(searchState?.searchNotebookID || '');
	let filterTagIdArray = $state<string[]>([]);
	let filterExcludeTagIdArray = $state<string[]>([]);

	function submitForm() {
		if (!searchState) return;
		searchState.searchTerm = searchState.searchInput;
		searchState.searchNotebookID = filterNotebookID;
		searchState.selectedTagIdArray = filterTagIdArray;
		searchState.selectedExcludeTagIdArray = filterExcludeTagIdArray;
		searchState.makeFilterQuery(searchState.searchInput);
		console.log('searchState', searchState);
		search(searchState.customFilter);
		isOpen = false;
	}

	onMount(() => {
		searchState = getSearchState();
	});
</script>

<Dialog.Root open={isOpen}>
	<Dialog.Content
		onCloseAutoFocus={(e) => {
			e.preventDefault();
			isOpen = false;
		}}
		class="scrollbar-thin max-h-full max-w-4xl overflow-y-auto"
	>
		<Dialog.Header>
			<Dialog.Title>Filter Discovery</Dialog.Title>
		</Dialog.Header>

		<div class="gap-x-golden-md grid grid-cols-12 items-center">
			<div class="col-span-3">
				<legend class="fieldset-legend">Search Term</legend>
			</div>

			<input
				type="text"
				class="input col-span-8 col-start-4 w-full"
				placeholder="Search title and content..."
				bind:value={searchState.searchInput}
			/>

			<button
				onclick={() => {
					searchState.searchInput = '';
				}}
				class="btn col-span-1">Clear</button
			>
		</div>

		<div class="gap-x-golden-md grid grid-cols-12 items-center">
			<div class="col-span-3">
				<legend class="fieldset-legend">Notebook</legend>
			</div>

			<div class="col-span-8 w-full text-right">
				<SelectNotebook {notebooks} bind:selectedNotebookID={filterNotebookID} />
			</div>

			<button onclick={() => (filterNotebookID = '')} class="btn col-span-1">Clear</button>
		</div>

		<div class="gap-x-golden-md grid grid-cols-12 items-start">
			<div class="col-span-3">
				<legend class="fieldset-legend">Tags</legend>
			</div>
			<div class="col-span-9 col-start-4 text-right">
				<SelectTags {tags} bind:selectedTagIdArray={filterTagIdArray} />
			</div>
		</div>

		<div class="gap-x-golden-md grid grid-cols-12 items-start">
			<div class="col-span-3">
				<legend class="fieldset-legend">Exclude Tags</legend>
			</div>
			<div class="col-span-9 col-start-4 text-right">
				<SelectTags {tags} bind:selectedTagIdArray={filterExcludeTagIdArray} />
			</div>
		</div>

		<div class="flex justify-end gap-x-2">
			<button
				onclick={() => {
					isOpen = false;
				}}
				class="btn">Close</button
			>
			<button onclick={submitForm} class="btn btn-primary">Save</button>
		</div>
	</Dialog.Content>
</Dialog.Root>
