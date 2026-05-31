<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatPrice } from '$lib/utils';
	import CoinIcon from './CoinIcon.svelte';

	const { ad }: { ad: any } = $props();

	const change = $derived(Number(ad.coinChange24h ?? 0));
</script>

<button
	class="group relative flex h-28 w-40 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-center transition-all hover:border-yellow-500/60 hover:bg-yellow-500/10"
	onclick={() => goto(`/coin/${ad.coinSymbol}`)}
	title="Sponsored: {ad.coinName}"
>
	<span class="absolute top-1.5 right-2 text-[9px] font-semibold tracking-widest text-yellow-500/70 uppercase">ad</span>
	<CoinIcon icon={ad.coinIcon} symbol={ad.coinSymbol} size={8} />
	<div class="w-full">
		<p class="truncate text-xs font-semibold leading-tight">{ad.coinName}</p>
		<p class="text-muted-foreground truncate text-[10px]">{ad.coinSymbol}</p>
	</div>
	<p class="font-mono text-[11px] font-bold">${formatPrice(Number(ad.coinPrice))}</p>
	<span class="text-[10px] font-medium {change >= 0 ? 'text-green-500' : 'text-red-500'}">
		{change >= 0 ? '+' : ''}{change.toFixed(2)}%
	</span>
</button>
