import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { createGame, saveGame, playerView } from '$lib/server/games/uno';
import { redis } from '$lib/server/redis';

async function pushUnoState(game: ReturnType<typeof createGame>, userId: number) {
	const state = playerView(game, userId);
	await redis.publish(`notifications:${userId}`, JSON.stringify({ type: 'uno_update', state }));
}

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const duelId = Number(params.id);

	const gameId = await db.transaction(async (tx) => {
		const [d] = await tx
			.select({
				id: duel.id,
				challengerId: duel.challengerId,
				challengedId: duel.challengedId,
				betAmount: duel.betAmount,
				betType: duel.betType,
				status: duel.status,
				expiresAt: duel.expiresAt
			})
			.from(duel)
			.where(and(eq(duel.id, duelId), eq(duel.challengedId, userId)))
			.for('update')
			.limit(1);

		if (!d) throw error(404, 'Duel not found');
		if (d.status !== 'PENDING') throw error(400, 'Duel is no longer pending');
		if (new Date(d.expiresAt) < new Date()) {
			await tx.update(duel).set({ status: 'EXPIRED' }).where(eq(duel.id, duelId));
			if (d.betType === 'cash') {
				await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${d.betAmount}` }).where(eq(user.id, d.challengerId));
			} else {
				await tx.update(user).set({ gems: sql`${user.gems} + ${Number(d.betAmount)}` }).where(eq(user.id, d.challengerId));
			}
			throw error(400, 'Duel has expired');
		}

		const bet = Number(d.betAmount);
		const [challenged] = await tx
			.select({ baseCurrencyBalance: user.baseCurrencyBalance, gems: user.gems })
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);

		if (d.betType === 'cash' && Number(challenged.baseCurrencyBalance) < bet) throw error(400, 'Insufficient balance');
		if (d.betType === 'gems' && challenged.gems < bet) throw error(400, 'Not enough gems');

		if (d.betType === 'cash') {
			await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} - ${bet}` }).where(eq(user.id, userId));
		} else {
			await tx.update(user).set({ gems: sql`${user.gems} - ${bet}` }).where(eq(user.id, userId));
		}

		const gId = randomBytes(8).toString('hex');
		await tx.update(duel).set({ status: 'IN_GAME', gameId: gId }).where(eq(duel.id, duelId));
		return { gId, challengerId: d.challengerId };
	});

	const game = createGame(gameId.gId, duelId, gameId.challengerId, userId);
	await saveGame(game);

	await Promise.all([
		pushUnoState(game, gameId.challengerId),
		pushUnoState(game, userId)
	]);

	return json({ success: true, gameId: gameId.gId });
}
