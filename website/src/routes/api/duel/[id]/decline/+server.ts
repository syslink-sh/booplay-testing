import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);

	const [d] = await db
		.select({ id: duel.id, challengerId: duel.challengerId, betAmount: duel.betAmount, betType: duel.betType, status: duel.status })
		.from(duel)
		.where(and(eq(duel.id, Number(params.id)), eq(duel.challengedId, userId)))
		.limit(1);

	if (!d) throw error(404, 'Duel not found');
	if (d.status !== 'PENDING') throw error(400, 'Duel is no longer pending');

	await db.transaction(async (tx) => {
		await tx.update(duel).set({ status: 'DECLINED' }).where(eq(duel.id, d.id));

		// Refund challenger
		if (d.betType === 'cash') {
			await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${d.betAmount}` }).where(eq(user.id, d.challengerId));
		} else {
			await tx.update(user).set({ gems: sql`${user.gems} + ${Number(d.betAmount)}` }).where(eq(user.id, d.challengerId));
		}
	});

	return json({ success: true });
}
