<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { unoGameStore } from '$lib/stores/websocket';
	import { USER_DATA } from '$lib/stores/user-data';
	import UnoCard from './UnoCard.svelte';

	const { gameId }: { gameId: string } = $props();

	let game = $state<any>(null);
	let loading = $state(true);
	let acting = $state(false);
	let colorPick = $state<string | null>(null);
	let forfeiting = $state(false);

	const COLORS = ['red', 'green', 'blue', 'yellow'];
	const COLOR_BG: Record<string, string> = {
		red: 'bg-red-600 hover:bg-red-500',
		green: 'bg-green-600 hover:bg-green-500',
		blue: 'bg-blue-600 hover:bg-blue-500',
		yellow: 'bg-yellow-500 hover:bg-yellow-400'
	};
	const INDICATOR_BG: Record<string, string> = {
		red: 'bg-red-500',
		green: 'bg-green-500',
		blue: 'bg-blue-500',
		yellow: 'bg-yellow-400',
		wild: 'bg-muted'
	};

	async function fetchState() {
		try {
			const res = await fetch(`/api/uno/${gameId}/state`);
			if (res.ok) game = await res.json();
		} catch {}
		finally { loading = false; }
	}

	$effect(() => {
		if ($unoGameStore?.gameId === gameId) game = $unoGameStore;
	});

	async function play(cardId: string, chosenColor?: string) {
		if (acting) return;
		acting = true;
		try {
			const res = await fetch(`/api/uno/${gameId}/play`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId, chosenColor })
			});
			const data = await res.json();
			if (!res.ok) toast.error(data.message ?? 'Invalid play');
		} catch {
			toast.error('Something went wrong');
		} finally {
			acting = false;
			colorPick = null;
		}
	}

	async function draw() {
		if (acting || !game?.isMyTurn) return;
		acting = true;
		try {
			const res = await fetch(`/api/uno/${gameId}/draw`, { method: 'POST' });
			if (!res.ok) {
				const d = await res.json();
				toast.error(d.message ?? 'Cannot draw');
			}
		} catch {
			toast.error('Something went wrong');
		} finally {
			acting = false;
		}
	}

	async function forfeit() {
		if (forfeiting) return;
		forfeiting = true;
		try {
			await fetch(`/api/uno/${gameId}/forfeit`, { method: 'POST' });
		} catch {}
		finally { forfeiting = false; }
	}

	function onCardClick(card: any) {
		if (!game?.isMyTurn || acting) return;
		if (!isPlayable(card)) return;
		if (card.color === 'wild') colorPick = card.id;
		else play(card.id);
	}

	function isPlayable(card: any): boolean {
		if (!game) return false;
		if (card.color === 'wild') return true;
		return card.color === game.currentColor || card.value === game.topCard.value;
	}

	beforeNavigate(() => {
		if (game?.status === 'active') forfeit();
	});

	onMount(() => {
		fetchState();
		return () => { if (game?.status === 'active') forfeit(); };
	});
</script>

{#if colorPick}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="rounded-2xl border bg-card p-6 text-center shadow-xl">
			<p class="text-foreground mb-4 text-lg font-bold">Choose a color</p>
			<div class="grid grid-cols-2 gap-3">
				{#each COLORS as c}
					<button
						class="h-14 w-32 rounded-xl font-semibold text-white transition-all hover:scale-105 {COLOR_BG[c]}"
						onclick={() => play(colorPick!, c)}
					>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
				{/each}
			</div>
			<button class="text-muted-foreground hover:text-foreground mt-4 text-sm" onclick={() => (colorPick = null)}>Cancel</button>
		</div>
	</div>
{/if}

{#if loading}
	<div class="flex h-96 items-center justify-center">
		<p class="text-muted-foreground">Loading game…</p>
	</div>
{:else if !game}
	<div class="flex h-96 items-center justify-center">
		<p class="text-muted-foreground">Game not found.</p>
	</div>
{:else if game.status === 'completed'}
	<div class="flex min-h-[500px] flex-col items-center justify-center gap-4 p-8 text-center">
		{#if game.winnerId === Number($USER_DATA?.id)}
			<p class="text-5xl font-black text-yellow-500">You Won!</p>
			<p class="text-muted-foreground">You emptied your hand first. Bet collected.</p>
		{:else}
			<p class="text-5xl font-black text-red-500">You Lost</p>
			<p class="text-muted-foreground">Your opponent finished first.</p>
		{/if}
	</div>
{:else}
	<div class="flex min-h-[600px] flex-col gap-4 p-4 select-none">

		<!-- Opponent -->
		<div class="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
			<div class="flex items-center gap-1">
				{#each Array(Math.min(game.opponentCardCount, 10)) as _, i (i)}
					<UnoCard color="wild" value="wild" faceDown />
				{/each}
				{#if game.opponentCardCount > 10}
					<span class="text-muted-foreground ml-1 self-center text-sm">+{game.opponentCardCount - 10}</span>
				{/if}
			</div>
			<span class="text-muted-foreground bg-muted rounded-full px-3 py-1 text-sm font-medium">{game.opponentCardCount} cards</span>
		</div>

		<!-- Board -->
		<div class="flex flex-1 items-center justify-center gap-8 rounded-lg border bg-muted/10 py-6">
			<div class="flex flex-col items-center gap-2">
				<button
					class="transition-transform hover:scale-105 disabled:opacity-40"
					onclick={draw}
					disabled={!game.isMyTurn || acting}
					title="Draw a card"
				>
					<UnoCard color="wild" value="wild" faceDown />
				</button>
				<span class="text-muted-foreground text-xs">{game.drawPileCount} in pile</span>
			</div>

			<div class="flex flex-col items-center gap-2">
				<UnoCard color={game.topCard.color} value={game.topCard.value} />
				<span class="text-muted-foreground text-xs">Discard</span>
			</div>

			<div class="flex flex-col items-center gap-2">
				<div class="h-10 w-10 rounded-full border-2 {INDICATOR_BG[game.currentColor] ?? 'bg-muted'}"></div>
				<span class="text-muted-foreground text-xs capitalize">{game.currentColor}</span>
			</div>
		</div>

		<!-- Turn -->
		<div class="text-center">
			{#if game.isMyTurn}
				<span class="rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-semibold text-green-500">Your turn — tap a card or draw</span>
			{:else}
				<span class="text-muted-foreground bg-muted rounded-full px-4 py-1.5 text-sm">Waiting for opponent…</span>
			{/if}
		</div>

		<!-- Hand -->
		<div class="rounded-lg border bg-muted/30 p-3">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-muted-foreground text-sm">Your hand ({game.myHand.length} cards)</span>
				<button
					class="text-muted-foreground hover:text-destructive text-xs transition-colors disabled:opacity-40"
					onclick={forfeit}
					disabled={forfeiting}
				>{forfeiting ? 'Forfeiting…' : 'Forfeit'}</button>
			</div>
			<div class="flex gap-1.5 overflow-x-auto pb-1">
				{#each game.myHand as card (card.id)}
					{@const playable = game.isMyTurn && isPlayable(card)}
					<UnoCard
						color={card.color}
						value={card.value}
						{playable}
						onclick={playable ? () => onCardClick(card) : undefined}
					/>
				{/each}
			</div>
		</div>
	</div>
{/if}
