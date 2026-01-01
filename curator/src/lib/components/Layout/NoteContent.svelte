<script lang="ts">
	import { ImageViewer } from 'svelte-image-viewer';
	import { TrixEditor } from 'svelte-trix';

	import { fade, scale } from 'svelte/transition';

	import { CaseSensitive, CircleX } from 'lucide-svelte';

	import { ScrollArea } from '$lib/components/ui/scroll-area/index';

	import { NoteState, uploadFileToPocketbase } from '$lib/db.svelte';
	import {
		addMediaToContent,
		addResourcesToRecord,
		addThumbnailToRecord,
		getFileHash,
		getResourceforThumbGen,
		makeResourceFromFile,
		replacePbUrl
	} from '$lib/utils';

	type Props = {
		noteState: NoteState;
	};

	let { noteState }: Props = $props();

	let note = $derived(noteState.note);
	let content = $derived(replacePbUrl(noteState.note?.content ?? ''));
	let noteTitle = $state(noteState.note?.title ?? '');
	let textContent = $state('');
	let editor: Element;

	let iframe = $state();

	let isOpen = $state(false);
	let isEditHTML = $state(false);
	let selectedImage = $state('');

	function closeModal() {
		isOpen = false;
	}

	function onImageClick(src: string) {
		selectedImage = src;
		isOpen = true;
	}

	async function handleFile(e: Event) {
		e.preventDefault();
		if (!note?.id) return;

		const file = e.file as File;

		// upload file and get url
		const fileURL = await uploadFileToPocketbase(note?.id, file);
		if (!fileURL) return;

		// get hash
		const hash = await getFileHash(file);

		// create resource
		const newResource = makeResourceFromFile(file, hash, fileURL);

		// add to resources
		const mergedResources = await addResourcesToRecord(note.id, newResource);
		if (!mergedResources) return;

		// check thumbnails
		if (!note.thumbnail) {
			const thumbResource = getResourceforThumbGen(mergedResources);
			await addThumbnailToRecord(note?.id, thumbResource.fileURL);
		}

		// get new file content
		const newContent = addMediaToContent(file.type, fileURL, file.name);

		// insert file content to editor
		editor.editor.insertHTML(newContent);
	}

	// async function insertFile(file: File) {
	// 	// upload file and get url
	// 	const fileURL = await uploadFileToPocketbase(note?.id, file);

	// 	// get hash
	// 	const hash = await getFileHash(file);

	// 	// create resourc
	// 	const resource = makeResourceFromFile(file, hash, fileURL);

	// 	// add to resources
	// 	const mergedResources = addResourcesToRecord(note.id, resource);

	// 	// check thumbnails

	// 	// get new file content
	// 	const newContent = addMediaToContent(file.type, fileURL, file.name);

	// 	console.log(newContent);

	// 	// insert file content to editor
	// 	return newContent;
	// }

	// async function handlePaste(e: Event) {
	// 	const items = event.clipboardData.items;
	// 	const doc = iframe.contentDocument;
	// 	for (const item of items) {
	// 		if (item.type.startsWith('image')) {
	// 			e.preventDefault();
	// 			const file = item.getAsFile();
	// 			const htmlToAdd = await insertFile(file);
	// 			// const selection = doc.getSelection();

	// 			doc.execCommand('insertHTML', false, htmlToAdd);
	// 		}
	// 	}
	// }

	function manipulateIframe(doc) {
		// click link opens browser
		const links = doc.querySelectorAll('a');
		links.forEach((link) => {
			link.addEventListener('click', (e) => {
				e.preventDefault(); // Prevent default navigation
				window.open(link.href);
			});
		});
		// remove image links
		const imgLinks = doc.querySelectorAll('a img');
		imgLinks.forEach((img) => {
			const link = img.parentElement;
			try {
				link.parentNode.insertBefore(img, link);
				link.parentNode.removeChild(link);
			} catch (e) {
				console.log(e);
			}
		});
		// add image viewing clicks
		const images = doc.querySelectorAll('img');
		images.forEach((img) => {
			img.addEventListener('click', () => {
				onImageClick(img.src);
			});
		});
	}

	function handler(event: KeyboardEvent) {
		document.dispatchEvent(new KeyboardEvent(event.type, event));
	}

	function initializeIframe(el) {
		const doc = el.contentDocument;
		doc.open();
		doc.write(`<!DOCTYPE html>${content}`);
		doc.close();

		manipulateIframe(doc);

		const styleTag = doc.createElement('style');
		styleTag.setAttribute('id', 'custom-style');
		styleTag.textContent = noteState.customStyles;
		doc.head.appendChild(styleTag);

		doc.addEventListener('keydown', handler);

		return () => {
			document.removeEventListener('keydown', handler);
		};
	}

	function loadHeight(el) {
		el.style.height = '0px';
		const doc = el.contentDocument;
		const height = doc.body.scrollHeight;
		el.style.height = `${height + 100}px`;

		el.onload = () => {
			el.style.height = '0px';
			const doc = el.contentDocument;
			const height = doc.body.scrollHeight;
			el.style.height = `${height + 100}px`;
		};
	}

	function changeFontSize(el) {
		const doc = el.contentDocument;
		const styleTag = doc.createElement('style');
		styleTag.setAttribute('id', 'custom-style');
		styleTag.textContent = noteState.customStyles;
		doc.head.appendChild(styleTag);
	}

	$effect(() => {
		noteTitle = noteState.note.title;
		textContent = '';
		isEditHTML = false;
	});
</script>

<div class="bg-base-100/90 p-golden-sm md:p-golden-md z-20 flex w-full px-4 md:sticky md:top-0">
	<div class="flex w-full">
		<input
			class="card-title focus:ring-base-content/40 bg-base-100/90 mr-2 grow truncate rounded-md border-0"
			bind:value={noteTitle}
			onchange={async () => {
				await noteState.changeTitle(noteTitle);
				await noteState.getNote();
			}}
		/>
		<div
			class="text-base-content/20 hover:text-base-content hidden items-center gap-x-4 transition-colors duration-300 md:flex"
		>
			<input
				type="range"
				class="range range-xs"
				min="0.96"
				max="1.1"
				step="0.01"
				bind:value={noteState.fontScale}
			/>
			<CaseSensitive size={32} />
		</div>
	</div>
</div>

<ScrollArea scrollHideDelay={200} type="scroll" class="mb-20 h-full">
	<div class="card mx-auto mt-10 max-w-3xl px-2 pb-40 md:px-10 lg:max-w-5xl">
		<iframe
			title="content"
			class="bg-base-100 mb-10"
			scrolling="no"
			bind:this={iframe}
			{@attach initializeIframe}
			{@attach loadHeight}
			{@attach changeFontSize}
		></iframe>

		{#if isEditHTML}
			<TrixEditor
				onAttachmentAdd={() => {}}
				onFileAccept={handleFile}
				bind:value={textContent}
				bind:editor
			/>

			<div class="mt-10 flex justify-end gap-x-2">
				<button
					class="btn"
					onclick={() => {
						textContent = '';
						isEditHTML = false;
					}}>Cancel</button
				>
				<button
					class="btn btn-primary"
					onclick={async () => {
						await noteState.appendContent(textContent);
						textContent = '';
						isEditHTML = false;
					}}>Save</button
				>
				<!-- <button
					class="btn btn-primary"
					onclick={async () => {
						const doc = iframe.contentDocument;
						const customStyle = doc.head.querySelector('#custom-style');
						if (customStyle) customStyle.remove();

						await noteState.updateContent(doc.documentElement.outerHTML);

						doc.designMode = 'off';
						isEditHTML = false;
					}}>Save iframe</button
				> -->
			</div>
		{:else}
			<div class="flex justify-end">
				<button
					onclick={() => {
						isEditHTML = true;
					}}
					class="btn">Add to Note</button
				>
				<!-- <button
					onclick={() => {
						const doc = iframe.contentDocument;
						doc.designMode = 'on';
						doc.addEventListener('paste', handlePaste);
						isEditHTML = true;
					}}
					class="btn">edit iframe</button
				> -->
			</div>
		{/if}
	</div>
</ScrollArea>

{#if isOpen}
	<div
		class="bg-base-100 fixed top-0 left-0 z-30 flex h-screen w-screen items-center justify-center"
		transition:fade={{ duration: 100 }}
	>
		<button class="absolute top-10 right-15 z-30 hover:cursor-pointer" onclick={closeModal}>
			<CircleX size={42} class="stroke-base-content fill-base-100  drop-shadow-lg " />
		</button>
		<button onclick={(event) => event.stopPropagation()} in:scale={{ start: 0.8, duration: 200 }}>
			<ImageViewer src={selectedImage} />
		</button>
	</div>
{/if}
