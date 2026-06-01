import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { loadGame, saveGame, playCard, playerView, deleteGame, opponent } from '$lib/server/games/uno';
import { redis } from '$lib/server/redis';
import { createNotification } from '$lib/server/notification';
import type { Color } from '$lib/server/games/uno';

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const { cardId, chosenColor } = await request.json();

	const game = await loadGame(params.gameId);
	if (!game) throw error(404, 'Game not found');
	if (userId !== game.p1 && userId !== game.p2) throw error(403, 'Not a player in this game');

	const err = playCard(game, userId, cardId, chosenColor as Color | undefined);
	if (err) throw error(400, err);

	if (game.status === 'completed' && game.winnerId) {
		const loserId = opponent(game, game.winnerId);

		const [d] = await db.select({ betAmount: duel.betAmount, betType: duel.betType }).from(duel).where(eq(duel.id, game.duelId)).limit(1);
		const bet = Number(d.betAmount);
		const payout = bet * 2;

		await db.transaction(async (tx) => {
			await tx.update(duel).set({ status: 'COMPLETED', winnerId: game.winnerId, completedAt: new Date() }).where(eq(duel.id, game.duelId));
			if (d.betType === 'cash') {
				await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${payout}` }).where(eq(user.id, game.winnerId!));
			} else {
				await tx.update(user).set({ gems: sql`${user.gems} + ${payout}` }).where(eq(user.id, game.winnerId!));
			}
		});

		const betStr = d.betType === 'cash' ? `$${bet}` : `${bet} gems`;

		const [w] = await db.select({ username: user.username }).from(user).where(eq(user.id, game.winnerId)).limit(1);
		const [l] = await db.select({ username: user.username }).from(user).where(eq(user.id, loserId)).limit(1);

		await Promise.all([
			redis.publish(`notifications:${game.winnerId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, game.winnerId) })),
			redis.publish(`notifications:${loserId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, loserId) })),
			createNotification(game.winnerId.toString(), 'SYSTEM', 'Uno — You won!', `You beat @${l.username} and won ${betStr}!`, '/1v1'),
			createNotification(loserId.toString(), 'SYSTEM', 'Uno — You lost', `@${w.username} beat you. Better luck next time.`, '/1v1')
		]);

		await deleteGame(params.gameId);
	} else {
		await saveGame(game);
		const opp = opponent(game, userId);
		await Promise.all([
			redis.publish(`notifications:${userId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, userId) })),
			redis.publish(`notifications:${opp}`, JSON.stringify({ type: 'uno_update', state: playerView(game, opp) }))
		]);
	}

	return json({ success: true });
}
