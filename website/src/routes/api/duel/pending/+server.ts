import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { and, eq, gt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const challenger = alias(user, 'challenger');
	const challenged = alias(user, 'challenged');

	const rows = await db
		.select({
			id: duel.id,
			betAmount: duel.betAmount,
			betType: duel.betType,
			challengerSide: duel.challengerSide,
			expiresAt: duel.expiresAt,
			createdAt: duel.createdAt,
			challengerId: duel.challengerId,
			challengedId: duel.challengedId,
			challengerUsername: challenger.username,
			challengedUsername: challenged.username
		})
		.from(duel)
		.innerJoin(challenger, eq(duel.challengerId, challenger.id))
		.innerJoin(challenged, eq(duel.challengedId, challenged.id))
		.where(
			and(
				eq(duel.status, 'PENDING'),
				gt(duel.expiresAt, new Date()),
				or(eq(duel.challengerId, userId), eq(duel.challengedId, userId))
			)
		)
		.orderBy(duel.createdAt);

	return json(rows);
}
