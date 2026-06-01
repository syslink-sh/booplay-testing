import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { loadGame, playerView } from '$lib/server/games/uno';

export async function GET({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const game = await loadGame(params.gameId);
	if (!game) throw error(404, 'Game not found');

	const userId = Number(session.user.id);
	if (userId !== game.p1 && userId !== game.p2) throw error(403, 'Not a player in this game');

	return json(playerView(game, userId));
}
