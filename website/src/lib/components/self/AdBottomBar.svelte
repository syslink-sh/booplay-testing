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
	<div class="fixed right-0 bottom-0 left-0 z-40 border-t bg-background/95 backdrop-blur-sm" style="left: var(--sidebar-width, 0px)">
		<div class="flex items-center gap-3 overflow-x-auto px-4 py-2 scrollbar-none">
			<span class="text-muted-foreground shrink-0 text-[9px] font-semibold tracking-widest uppercase">Sponsored</span>
			{#each ads as ad (ad.id)}
				{@const change = Number(ad.coinChange24h ?? 0)}
				<button
					class="flex shrink-0 items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-1.5 transition-all hover:border-yellow-500/60 hover:bg-yellow-500/10"
					onclick={() => goto(`/coin/${ad.coinSymbol}`)}
					title="Sponsored: {ad.coinName}"
				>
					<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={5} />
					<div class="text-left">
						<p class="text-xs font-semibold leading-tight">{ad.coinName}</p>
						<p class="text-muted-foreground text-[10px]">{ad.coinSymbol}</p>
					</div>
					<span class="text-[10px] font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
						{change >= 0 ? '+' : ''}{change.toFixed(2)}%
					</span>
					<span class="text-[8px] font-semibold tracking-widest text-yellow-500/70 uppercase">ad</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
