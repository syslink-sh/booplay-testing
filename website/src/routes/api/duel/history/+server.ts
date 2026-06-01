import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { desc, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET({ request, url }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const challenger = alias(user, 'challenger');
	const challenged = alias(user, 'challenged');

	const rows = await db
		.select({
			id: duel.id,
			betAmount: duel.betAmount,
			betType: duel.betType,
			status: duel.status,
			winnerId: duel.winnerId,
			challengerSide: duel.challengerSide,
			coinResult: duel.coinResult,
			completedAt: duel.completedAt,
			createdAt: duel.createdAt,
			challengerId: duel.challengerId,
			challengedId: duel.challengedId,
			challengerUsername: challenger.username,
			challengedUsername: challenged.username
		})
		.from(duel)
		.innerJoin(challenger, eq(duel.challengerId, challenger.id))
		.innerJoin(challenged, eq(duel.challengedId, challenged.id))
		.where(or(eq(duel.challengerId, userId), eq(duel.challengedId, userId)))
		.orderBy(desc(duel.createdAt))
		.limit(20)
		.offset((page - 1) * 20);

	return json(rows);
}
