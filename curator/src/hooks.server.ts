import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Get the dynamic URL (fallback to localhost for safety)
	const pbUrl = env.PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

	// 2. Resolve the request
	const response = await resolve(event);

	// 3. Define the CSP policy
	// 'self' allows the app to talk to its own origin (homenas:3003)
	// ${pbUrl} allows the browser to talk to PocketBase
	const csp = [
		"default-src 'self'",
		`connect-src 'self' http://127.0.0.1:8090 ${pbUrl}`,
		`img-src 'self' https://i.ytimg.com data: http://127.0.0.1:8090 http://localhost:8090 ${pbUrl} blob:${pbUrl}`,
		`media-src 'self' data: http://127.0.0.1:8090 http://pocketbase:8090 http://localhost:8090 ${pbUrl}`,
		"script-src 'self' 'unsafe-inline'", // Svelte needs inline scripts for hydration
		"style-src 'self' 'unsafe-inline' http://127.0.0.1:8090 https://fonts.googleapis.com/ http://localhost:8090",
		"font-src 'self' data: http://127.0.0.1:8090  https://fonts.googleapis.com https://fonts.gstatic.com http://localhost:8090",
		"object-src 'none'",
		"frame-ancestors 'none'",
		`frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com http://127.0.0.1:8090 http://localhost:8090`
	].join('; ');

	// 4. Set the header
	response.headers.set('Content-Security-Policy', csp);

	return response;
};
