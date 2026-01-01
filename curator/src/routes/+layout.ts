import { getAuth, makeDefaultNotebook } from '$lib/db.svelte'

export async function load() {
    await getAuth()
    await makeDefaultNotebook()
}