import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { duel, user } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { createNotification } from '$lib/server/notification';
import { hasFlag } from '$lib/data/flags';

export async function POST({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const { username, betAmount, betType } = await request.json();

	if (!['cash', 'gems'].includes(betType)) throw error(400, 'Invalid bet type');
	if (!betAmount || betAmount <= 0) throw error(400, 'Invalid bet amount');

	const challengerId = Number(session.user.id);

	const [challenged] = await db
		.select({ id: user.id, username: user.username, flags: user.flags })
		.from(user)
		.where(eq(user.username, username.trim()))
		.limit(1);

	if (!challenged) throw error(404, 'User not found');
	if (challenged.id === challengerId) throw error(400, "You can't duel yourself");
	if (hasFlag(challenged.flags, 'NO_ARCADE')) throw error(400, 'That user cannot participate in duels');

	const [challenger] = await db
		.select({ baseCurrencyBalance: user.baseCurrencyBalance, gems: user.gems, flags: user.flags })
		.from(user)
		.where(eq(user.id, challengerId))
		.for('update')
		.limit(1);

	if (hasFlag(challenger.flags, 'NO_ARCADE')) throw error(403, "You can't participate in duels");

	if (betType === 'cash' && Number(challenger.baseCurrencyBalance) < betAmount) throw error(400, 'Insufficient balance');
	if (betType === 'gems' && challenger.gems < betAmount) throw error(400, 'Not enough gems');

	const [existingDuel] = await db
		.select({ id: duel.id })
		.from(duel)
		.where(and(eq(duel.challengerId, challengerId), eq(duel.status, 'PENDING')))
		.limit(1);

	if (existingDuel) throw error(400, 'You already have a pending challenge. Cancel it first.');

	const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

	await db.transaction(async (tx) => {
		if (betType === 'cash') {
			await tx.update(user).set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} - ${betAmount}` }).where(eq(user.id, challengerId));
		} else {
			await tx.update(user).set({ gems: sql`${user.gems} - ${betAmount}` }).where(eq(user.id, challengerId));
		}
		await tx.insert(duel).values({ challengerId, challengedId: challenged.id, betAmount: betAmount.toString(), betType, expiresAt });
	});

	const [me] = await db.select({ username: user.username }).from(user).where(eq(user.id, challengerId)).limit(1);

	await createNotification(
		challenged.id.toString(),
		'SYSTEM',
		'Duel Challenge',
		`@${me.username} is challenging you to a ${betType === 'cash' ? `$${betAmount}` : `${betAmount} gems`} Uno duel!`,
		'/1v1'
	);

	return json({ success: true });
}
