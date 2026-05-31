import { writable } from 'svelte/store';

export const ADS = writable<any[]>([]);

let timer: ReturnType<typeof setInterval> | null = null;
let fetching = false;

export async function fetchAds() {
	if (fetching) return;
	fetching = true;
	try {
		const res = await fetch('/api/ads/active?limit=15');
		if (res.ok) ADS.set(await res.json());
	} catch {}
	finally { fetching = false; }
}

export function initAds() {
	fetchAds();
	if (!timer) timer = setInterval(fetchAds, 30_000);
}
