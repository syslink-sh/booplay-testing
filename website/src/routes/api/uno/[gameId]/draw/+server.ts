import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { loadGame, saveGame, drawOne, playerView, opponent } from '$lib/server/games/uno';
import { redis } from '$lib/server/redis';

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const game = await loadGame(params.gameId);

	if (!game) throw error(404, 'Game not found');
	if (userId !== game.p1 && userId !== game.p2) throw error(403, 'Not a player in this game');
	if (game.turn !== userId) throw error(400, 'Not your turn');

	const drawn = drawOne(game, userId);
	if (!drawn) throw error(400, 'No cards to draw');

	await saveGame(game);

	const opp = opponent(game, userId);
	await Promise.all([
		redis.publish(`notifications:${userId}`, JSON.stringify({ type: 'uno_update', state: playerView(game, userId) })),
		redis.publish(`notifications:${opp}`, JSON.stringify({ type: 'uno_update', state: playerView(game, opp) }))
	]);

	return json({ success: true, card: drawn });
}
