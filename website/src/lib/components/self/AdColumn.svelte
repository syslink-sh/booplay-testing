<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import CoinIcon from './CoinIcon.svelte';

	const { hideAds = false }: { hideAds?: boolean } = $props();

	let ads = $state<any[]>([]);

	async function fetchAds() {
		try {
			const res = await fetch('/api/ads/active');
			if (res.ok) ads = await res.json();
		} catch {}
	}

	onMount(() => {
		fetchAds();
		const interval = setInterval(fetchAds, 60_000);
		return () => clearInterval(interval);
	});
</script>

{#if !hideAds && ads.length > 0}
	<aside class="hidden w-36 shrink-0 xl:flex xl:flex-col">
		<div class="sticky top-0 flex flex-col gap-2 py-4 pr-3">
			<span class="text-muted-foreground px-1 text-[9px] font-semibold tracking-widest uppercase">Sponsored</span>
			{#each ads as ad (ad.id)}
				{@const change = Number(ad.coinChange24h ?? 0)}
				<button
					class="group flex w-full flex-col items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-2 py-3 text-center transition-all hover:border-yellow-500/60 hover:bg-yellow-500/10"
					onclick={() => goto(`/coin/${ad.coinSymbol}`)}
					title="Sponsored: {ad.coinName}"
				>
					<span class="text-[8px] font-semibold tracking-widest text-yellow-500/70 uppercase">ad</span>
					<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={8} />
					<div class="w-full">
						<p class="truncate text-[11px] font-semibold leading-tight">{ad.coinName}</p>
						<p class="text-muted-foreground truncate text-[9px]">{ad.coinSymbol}</p>
					</div>
					<span class="text-[10px] font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
						{change >= 0 ? '+' : ''}{change.toFixed(2)}%
					</span>
				</button>
			{/each}
		</div>
	</aside>
{/if}
