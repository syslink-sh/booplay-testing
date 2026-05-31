<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { formatPrice } from '$lib/utils';
	import CoinIcon from './CoinIcon.svelte';

	const { hideAds = false, class: className = '' }: { hideAds?: boolean; class?: string } = $props();

	let ads = $state<any[]>([]);
	let idx = $state(0);

	async function load() {
		try {
			const res = await fetch('/api/ads/active');
			if (res.ok) ads = await res.json();
		} catch {}
	}

	onMount(() => {
		load();
		const fetchT = setInterval(load, 30_000);
		const rotateT = setInterval(() => {
			if (ads.length > 1) idx = (idx + 1) % ads.length;
		}, 8_000);
		return () => { clearInterval(fetchT); clearInterval(rotateT); };
	});

	const ad = $derived(ads[idx] ?? null);
</script>

{#if !hideAds && ad}
	{@const change = Number(ad.coinChange24h ?? 0)}
	<div class="flex justify-center {className}">
		<button
			class="group flex h-[250px] w-[300px] shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-yellow-500/25 bg-gradient-to-b from-yellow-500/5 to-background p-6 text-center shadow-sm transition-all hover:border-yellow-500/50 hover:shadow-md"
			onclick={() => goto(`/coin/${ad.coinSymbol}`)}
		>
			<span class="text-muted-foreground self-end text-[9px] font-semibold tracking-widest uppercase">sponsored</span>
			<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={14} />
			<div>
				<p class="text-lg font-bold">{ad.coinName}</p>
				<p class="text-muted-foreground text-sm">{ad.coinSymbol}</p>
				<p class="font-mono text-sm font-bold">${formatPrice(Number(ad.coinPrice))}</p>
			</div>
			<span class="inline-block rounded-full px-3 py-1 text-sm font-semibold {change >= 0 ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}">
				{change >= 0 ? '+' : ''}{change.toFixed(2)}% 24h
			</span>
			<p class="text-primary text-xs font-medium underline-offset-2 group-hover:underline">View Coin →</p>
		</button>
	</div>
{/if}
