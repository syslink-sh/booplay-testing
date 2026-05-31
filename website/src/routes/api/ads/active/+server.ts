import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { advertisement, coin, user } from '$lib/server/db/schema';
import { gt, eq } from 'drizzle-orm';

export async function GET() {
	const rows = await db
		.select({
			id: advertisement.id,
			expiresAt: advertisement.expiresAt,
			coinName: coin.name,
			coinSymbol: coin.symbol,
			coinIcon: coin.icon,
			coinPrice: coin.currentPrice,
			coinChange24h: coin.change24h
		})
		.from(advertisement)
		.innerJoin(coin, eq(advertisement.coinId, coin.id))
		.innerJoin(user, eq(advertisement.userId, user.id))
		.where(gt(advertisement.expiresAt, new Date()))
		.orderBy(advertisement.startsAt);

	return json(rows);
}
