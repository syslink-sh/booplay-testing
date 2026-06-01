import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { loadGame, deleteGame, playerView, opponent } from '$lib/server/games/uno';
import { redis } from '$lib/server/redis';
import { createNotification } from '$lib/server/notification';

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const game = await loadGame(params.gameId);

	if (!game) throw error(404, 'Game not found');
	if (userId !== game.p1 && userId !== game.p2) throw error(403, 'Not a player in this game');
	if (game.status !== 'active') throw error(400, 'Game already over');

	const winnerId = opponent(game, userId);

	game.status = 'completed';
	game.winnerId = winnerId;

	const [d] = await db
		.select({ betAmount: duel.betAmount, betType: duel.betType })
		.from(duel)
		.where(eq(duel.id, game.duelId))
		.limit(1);

	const bet = Number(d.betAmount);
	const payout = bet * 2;

	await db.transaction(async (tx) => {
		await tx.update(duel)
			.set({ status: 'COMPLETED', winnerId, completedAt: new Date() })
			.where(eq(duel.id, game.duelId));
		if (d.betType === 'cash') {
			await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${payout}` }).where(eq(user.id, winnerId));
		} else {
			await tx.update(user).set({ gems: sql`${user.gems} + ${payout}` }).where(eq(user.id, winnerId));
		}
	});

	const betStr = d.betType === 'cash' ? `$${bet}` : `${bet} gems`;

	await Promise.all([
		redis.publish(`notifications:${winnerId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, winnerId) })),
		redis.publish(`notifications:${userId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, userId) })),
		createNotification(winnerId.toString(), 'SYSTEM', 'Uno — Opponent forfeited', `Your opponent left the game. You win ${betStr}!`, '/1v1'),
	]);

	await deleteGame(params.gameId);
	return json({ success: true });
}
