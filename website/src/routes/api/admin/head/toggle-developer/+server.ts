import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hasFlag, UserFlags } from '$lib/data/flags';

export async function POST({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const [me] = await db
		.select({ flags: user.flags })
		.from(user)
		.where(eq(user.id, Number(session.user.id)))
		.limit(1);

	if (!hasFlag(me?.flags, 'IS_HEAD_ADMIN', 'IS_ADMIN')) throw error(403, 'Admin access required');

	const { username, grantDeveloper } = await request.json();
	if (!username?.trim() || grantDeveloper === undefined) throw error(400, 'Missing fields');

	const [target] = await db
		.select({ id: user.id, username: user.username, flags: user.flags })
		.from(user)
		.where(eq(user.username, username.trim()))
		.limit(1);

	if (!target) throw error(404, 'User not found');

	await db
		.update(user)
		.set({
			flags: grantDeveloper
				? sql`${target.flags} | ${UserFlags.DEVELOPER}`
				: sql`${target.flags} & ~${UserFlags.DEVELOPER}`,
			updatedAt: new Date()
		})
		.where(eq(user.id, target.id));

	try {
		const { clearUserCache } = await import('$lib/../hooks.server.js');
		clearUserCache(target.id.toString());
	} catch {}

	return json({
		success: true,
		message: `@${target.username} ${grantDeveloper ? 'now has' : 'no longer has'} the Developer badge.`
	});
}
