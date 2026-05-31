<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { formatPrice } from '$lib/utils';
	import CoinIcon from './CoinIcon.svelte';

	const { hideAds = false }: { hideAds?: boolean } = $props();

	let ads = $state<any[]>([]);

	async function load() {
		try {
			const res = await fetch('/api/ads/active');
			if (res.ok) ads = await res.json();
		} catch {}
	}

	onMount(() => {
		load();
		const t = setInterval(load, 30_000);
		return () => clearInterval(t);
	});
</script>

{#if !hideAds && ads.length > 0}
	<div class="flex w-full items-center justify-center border-b bg-muted/30 py-2">
		<div class="flex h-[90px] w-full max-w-[728px] items-center gap-3 overflow-hidden rounded border border-yellow-500/20 bg-background px-4">
			<span class="text-muted-foreground shrink-0 rotate-180 text-[9px] font-semibold tracking-widest uppercase" style="writing-mode: vertical-rl">ad</span>
			<div class="flex flex-1 gap-3 overflow-x-auto scrollbar-none">
				{#each ads as ad (ad.id)}
					{@const change = Number(ad.coinChange24h ?? 0)}
					<button
						class="flex shrink-0 items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/10"
						onclick={() => goto(`/coin/${ad.coinSymbol}`)}
					>
						<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={10} />
						<div class="text-left">
							<p class="text-sm font-bold leading-tight">{ad.coinName}</p>
							<p class="text-muted-foreground text-xs">{ad.coinSymbol}</p>
							<p class="font-mono text-xs font-bold">${formatPrice(Number(ad.coinPrice))}</p>
							<p class="text-xs font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
								{change >= 0 ? '+' : ''}{change.toFixed(2)}%
							</p>
						</div>
					</button>
				{/each}
			</div>
			<span class="text-muted-foreground shrink-0 text-[9px]">Sponsored</span>
		</div>
	</div>
{/if}
