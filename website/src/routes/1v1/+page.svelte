<script lang="ts">
	import {
		ChampionIcon,
		Coins01Icon,
		GemIcon,
		Cancel01Icon,
		CheckmarkCircle02Icon,
		UserMultiple02Icon,
		ArrowRight01Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { formatTimeUntil, formatRelativeTime } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import UnoGame from '$lib/components/self/UnoGame.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { GEMS_BALANCE, fetchGemsBalance } from '$lib/stores/gems';
	import { unoGameStore } from '$lib/stores/websocket';

	let pending = $state<any[]>([]);
	let history = $state<any[]>([]);
	let loading = $state(true);
	let shouldSignIn = $state(false);

	let targetUsername = $state('');
	let betAmount = $state('');
	let betType = $state<'cash' | 'gems'>('cash');
	let creating = $state(false);

	// Active game — set from pending duel or WS push
	let activeGameId = $state<string | null>(null);

	const incoming = $derived(pending.filter((d) => d.challengedId === Number($USER_DATA?.id)));
	const outgoing = $derived(pending.filter((d) => d.challengerId === Number($USER_DATA?.id)));

	// If a WS push arrives and we're not already viewing the game, open it
	$effect(() => {
		if ($unoGameStore && !activeGameId) activeGameId = $unoGameStore.gameId;
	});

	async function load() {
		loading = true;
		try {
			const [p, h] = await Promise.all([
				fetch('/api/duel/pending').then((r) => r.json()),
				fetch('/api/duel/history').then((r) => r.json())
			]);
			pending = p;
			history = h;

			// Resume any in-progress game
			const inGame = [...p, ...h].find((d) => d.status === 'IN_GAME' && d.gameId);
			if (inGame && !activeGameId) activeGameId = inGame.gameId;
		} catch {
			toast.error('Failed to load duels');
		} finally {
			loading = false;
		}
	}

	async function create() {
		if (!targetUsername.trim() || !betAmount || Number(betAmount) <= 0) return;
		creating = true;
		try {
			const res = await fetch('/api/duel/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: targetUsername.trim(), betAmount: Number(betAmount), betType })
			});
			const data = await res.json();
			if (!res.ok) { toast.error(data.message ?? 'Failed to send challenge'); return; }
			toast.success(`Challenge sent to @${targetUsername}!`);
			targetUsername = '';
			betAmount = '';
			await load();
		} catch {
			toast.error('Something went wrong');
		} finally {
			creating = false;
		}
	}

	async function accept(duelId: number) {
		try {
			const res = await fetch(`/api/duel/${duelId}/accept`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) { toast.error(data.message ?? 'Failed to accept'); return; }
			activeGameId = data.gameId;
			await load();
			fetchGemsBalance();
		} catch {
			toast.error('Something went wrong');
		}
	}

	async function decline(duelId: number) {
		try {
			const res = await fetch(`/api/duel/${duelId}/decline`, { method: 'POST' });
			if (!res.ok) { toast.error('Failed to decline'); return; }
			await load();
		} catch {
			toast.error('Something went wrong');
		}
	}

	async function cancel(duelId: number) {
		try {
			const res = await fetch(`/api/duel/${duelId}/cancel`, { method: 'POST' });
			if (!res.ok) { toast.error('Failed to cancel'); return; }
			toast.success('Challenge cancelled, bet refunded');
			await load();
			fetchGemsBalance();
		} catch {
			toast.error('Something went wrong');
		}
	}

	function betLabel(d: any) {
		return d.betType === 'cash'
			? `$${Number(d.betAmount).toLocaleString()}`
			: `${Number(d.betAmount).toLocaleString()} gems`;
	}

	onMount(() => {
		if (!$USER_DATA) return;
		load();
		fetchGemsBalance();
	});
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="flex min-h-full flex-col items-center justify-start px-4 py-8 sm:py-12">
	<div class="w-full max-w-3xl">
	{#if !$USER_DATA}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Sign in to challenge other players</div>
				<p class="text-muted-foreground mb-4 text-sm">You need an account to create and accept duels.</p>
				<Button onclick={() => (shouldSignIn = true)}>Sign in to continue</Button>
			</div>
		</div>
	{:else if activeGameId}
		<!-- Active Uno game -->
		<div class="mb-4 flex items-center justify-between">
			<h1 class="flex items-center gap-3 text-2xl font-bold">
				<HugeiconsIcon icon={ChampionIcon} class="h-6 w-6 text-yellow-500" />
				Uno Duel
			</h1>
			<Button variant="ghost" size="sm" onclick={() => { activeGameId = null; unoGameStore.set(null); load(); }}>
				Back to lobby
			</Button>
		</div>
		<div class="min-h-[600px] rounded-xl border bg-card">
			<UnoGame gameId={activeGameId} />
		</div>
	{:else}
		<h1 class="mb-8 flex items-center gap-3 text-3xl font-bold">
			<HugeiconsIcon icon={ChampionIcon} class="h-8 w-8 text-yellow-500" />
			1v1 Duels
		</h1>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<HugeiconsIcon icon={UserMultiple02Icon} class="h-5 w-5" />
						Challenge Someone
					</Card.Title>
					<Card.Description>Play Uno — first to empty their hand wins the bet</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<label class="mb-1.5 block text-sm font-medium">Opponent</label>
						<Input bind:value={targetUsername} placeholder="Username (without @)" />
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium">Bet type</label>
						<div class="grid grid-cols-2 gap-2">
							<button
								class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold transition-all
									{betType === 'cash' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-transparent bg-muted/50 hover:border-muted-foreground/40'}"
								onclick={() => (betType = 'cash')}
							>
								<HugeiconsIcon icon={Coins01Icon} class="h-4 w-4" /> Cash
							</button>
							<button
								class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold transition-all
									{betType === 'gems' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-transparent bg-muted/50 hover:border-muted-foreground/40'}"
								onclick={() => (betType = 'gems')}
							>
								<HugeiconsIcon icon={GemIcon} class="h-4 w-4" /> Gems
							</button>
						</div>
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium">
							Amount
							<span class="text-muted-foreground font-normal">
								— you have {betType === 'cash'
									? `$${Number($USER_DATA?.baseCurrencyBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
									: `${($GEMS_BALANCE ?? 0).toLocaleString()} gems`}
							</span>
						</label>
						<Input type="number" bind:value={betAmount} placeholder="0" min="1" />
					</div>

					<Button
						class="w-full bg-yellow-500 text-black hover:bg-yellow-400"
						onclick={create}
						disabled={creating || !targetUsername.trim() || !betAmount || Number(betAmount) <= 0}
					>
						<HugeiconsIcon icon={ArrowRight01Icon} class="h-4 w-4" />
						{creating ? 'Sending…' : 'Send Challenge'}
					</Button>
				</Card.Content>
			</Card.Root>

			<div class="space-y-4">
				{#if incoming.length > 0}
					<div>
						<h2 class="mb-3 font-semibold">Incoming</h2>
						<div class="space-y-3">
							{#each incoming as d (d.id)}
								<Card.Root class="border-yellow-500/30 bg-yellow-500/5">
									<Card.Content class="py-4">
										<div class="mb-3 flex items-center justify-between">
											<div>
												<p class="font-semibold">
													@{d.challengerUsername}
													<span class="text-muted-foreground font-normal">challenges you</span>
												</p>
												<p class="text-muted-foreground text-xs">Expires in {formatTimeUntil(d.expiresAt)}</p>
											</div>
											<Badge class="bg-yellow-500/15 text-yellow-500">{betLabel(d)}</Badge>
										</div>
										<p class="text-muted-foreground mb-3 text-sm">Game: Uno</p>
										<div class="flex gap-2">
											<Button size="sm" class="flex-1 bg-green-500 text-white hover:bg-green-600" onclick={() => accept(d.id)}>
												<HugeiconsIcon icon={CheckmarkCircle02Icon} class="h-4 w-4" /> Accept
											</Button>
											<Button size="sm" variant="destructive" class="flex-1" onclick={() => decline(d.id)}>
												<HugeiconsIcon icon={Cancel01Icon} class="h-4 w-4" /> Decline
											</Button>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				{/if}

				{#if outgoing.length > 0}
					<div>
						<h2 class="mb-3 font-semibold">Sent</h2>
						<div class="space-y-2">
							{#each outgoing as d (d.id)}
								<Card.Root>
									<Card.Content class="flex items-center justify-between py-3">
										<div>
											<p class="text-sm font-semibold">vs @{d.challengedUsername}</p>
											<p class="text-muted-foreground text-xs">
												{betLabel(d)} · Expires in {formatTimeUntil(d.expiresAt)}
											</p>
										</div>
										<Button size="sm" variant="outline" onclick={() => cancel(d.id)}>Cancel</Button>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				{/if}

				{#if incoming.length === 0 && outgoing.length === 0 && !loading}
					<div class="flex h-32 items-center justify-center rounded-lg border border-dashed">
						<p class="text-muted-foreground text-sm">No pending challenges</p>
					</div>
				{/if}
			</div>
		</div>

		{#if history.length > 0}
			<div class="mt-10">
				<h2 class="mb-4 text-lg font-semibold">History</h2>
				<div class="space-y-2">
					{#each history as d (d.id)}
						{@const won = d.winnerId === Number($USER_DATA?.id)}
						{@const opponent = d.challengerId === Number($USER_DATA?.id) ? d.challengedUsername : d.challengerUsername}
						<Card.Root class="{d.status === 'COMPLETED' ? (won ? 'border-green-500/20' : 'border-red-500/20') : 'opacity-60'}">
							<Card.Content class="flex items-center justify-between py-3">
								<div class="flex items-center gap-3">
									<HugeiconsIcon
										icon={ChampionIcon}
										class="h-5 w-5 shrink-0 {d.status === 'COMPLETED' ? (won ? 'text-yellow-500' : 'text-muted-foreground') : 'text-muted-foreground'}"
									/>
									<div>
										<p class="text-sm font-semibold">vs @{opponent}</p>
										<p class="text-muted-foreground text-xs">
											{betLabel(d)}
											{#if d.status !== 'COMPLETED'} · {d.status.toLowerCase()}{/if}
											{#if d.createdAt} · {formatRelativeTime(d.createdAt)}{/if}
										</p>
									</div>
								</div>
								{#if d.status === 'COMPLETED'}
									<Badge class="{won ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}">
										{won ? '+' : '-'}{betLabel(d)}
									</Badge>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
	</div>
</div>
