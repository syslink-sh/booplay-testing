<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { formatPrice } from '$lib/utils';
	import CoinIcon from './CoinIcon.svelte';

	const { hideAds = false, ads = [] }: { hideAds?: boolean; ads?: any[] } = $props();

	let showRight = $state(false);
	let showLeft = $state(false);
	let perPanel = $state(1);

	function measure() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const sidebarW = 256;
		const panelW = 140;
		const contentMax = 1280;

		const insetW = vw - sidebarW;
		const contentW = Math.min(insetW, contentMax);
		const leftGap = (insetW - contentW) / 2;
		const rightGap = vw - sidebarW - contentW - leftGap;

		showRight = rightGap >= panelW + 16;
		showLeft = leftGap >= panelW + 24;
		perPanel = Math.max(1, Math.floor((vh - 64) / 148));
	}

	onMount(() => {
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	function panelSlice(offset: number) {
		if (!ads.length) return [];
		return Array.from({ length: perPanel }, (_, i) => ads[(offset + i) % ads.length]);
	}
</script>

{#if !hideAds && ads.length > 0}
	{#if showRight}
		<div class="pointer-events-none fixed right-0 top-12 z-30 flex flex-col gap-2 p-2" style="width: 140px; max-height: calc(100vh - 52px); overflow: hidden;">
			{#each panelSlice(0) as ad (ad.id + 'r')}
				{@const change = Number(ad.coinChange24h ?? 0)}
				<button
					class="pointer-events-auto flex w-full flex-col items-center gap-1 rounded-lg border border-yellow-500/30 bg-background/95 px-2 py-2.5 text-center shadow-md backdrop-blur-sm transition-all hover:border-yellow-500/60 hover:bg-yellow-500/5"
					onclick={() => goto(`/coin/${ad.coinSymbol}`)}
				>
					<span class="text-[8px] font-semibold tracking-widest text-yellow-500/60 uppercase">ad</span>
					<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={8} />
					<p class="w-full truncate text-[10px] font-bold">{ad.coinName}</p>
					<p class="text-muted-foreground text-[9px]">{ad.coinSymbol}</p>
					<p class="font-mono text-[9px] font-bold">${formatPrice(Number(ad.coinPrice))}</p>
					<p class="text-[9px] font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
						{change >= 0 ? '+' : ''}{change.toFixed(2)}%
					</p>
				</button>
			{/each}
		</div>
	{/if}

	{#if showLeft}
		<div class="pointer-events-none fixed top-12 z-30 flex flex-col gap-2 p-2" style="left: 256px; width: 140px; max-height: calc(100vh - 52px); overflow: hidden;">
			{#each panelSlice(perPanel) as ad (ad.id + 'l')}
				{@const change = Number(ad.coinChange24h ?? 0)}
				<button
					class="pointer-events-auto flex w-full flex-col items-center gap-1 rounded-lg border border-yellow-500/30 bg-background/95 px-2 py-2.5 text-center shadow-md backdrop-blur-sm transition-all hover:border-yellow-500/60 hover:bg-yellow-500/5"
					onclick={() => goto(`/coin/${ad.coinSymbol}`)}
				>
					<span class="text-[8px] font-semibold tracking-widest text-yellow-500/60 uppercase">ad</span>
					<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={8} />
					<p class="w-full truncate text-[10px] font-bold">{ad.coinName}</p>
					<p class="text-muted-foreground text-[9px]">{ad.coinSymbol}</p>
					<p class="font-mono text-[9px] font-bold">${formatPrice(Number(ad.coinPrice))}</p>
					<p class="text-[9px] font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
						{change >= 0 ? '+' : ''}{change.toFixed(2)}%
					</p>
				</button>
			{/each}
		</div>
	{/if}
{/if}
