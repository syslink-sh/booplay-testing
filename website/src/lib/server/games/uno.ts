import { redis } from '$lib/server/redis';
import { randomBytes } from 'crypto';

export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
export type Value =
	| '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
	| 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
	id: string;
	color: Color;
	value: Value;
}

export interface UnoGame {
	gameId: string;
	duelId: number;
	p1: number;
	p2: number;
	p1Hand: UnoCard[];
	p2Hand: UnoCard[];
	drawPile: UnoCard[];
	topCard: UnoCard;
	currentColor: Color;
	turn: number; // userId
	status: 'active' | 'completed';
	winnerId: number | null;
	createdAt: number;
	lastActivity: number;
}

const PREFIX = 'uno:game:';
const TTL = 60 * 20; // 20 min

function randId() {
	return randomBytes(4).toString('hex');
}

function buildDeck(): UnoCard[] {
	const colors: Color[] = ['red', 'green', 'blue', 'yellow'];
	const deck: UnoCard[] = [];

	for (const color of colors) {
		deck.push({ id: randId(), color, value: '0' });
		for (const v of ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'] as Value[]) {
			deck.push({ id: randId(), color, value: v });
			deck.push({ id: randId(), color, value: v });
		}
	}
	for (let i = 0; i < 4; i++) {
		deck.push({ id: randId(), color: 'wild', value: 'wild' });
		deck.push({ id: randId(), color: 'wild', value: 'wild4' });
	}

	// shuffle
	for (let i = deck.length - 1; i > 0; i--) {
		const j = randomBytes(4).readUInt32BE(0) % (i + 1);
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
}

export function createGame(gameId: string, duelId: number, p1: number, p2: number): UnoGame {
	const deck = buildDeck();
	const p1Hand = deck.splice(0, 7);
	const p2Hand = deck.splice(0, 7);

	// Ensure first card is not a wild/action
	let topIdx = deck.findIndex((c) => c.color !== 'wild' && !['skip','reverse','draw2'].includes(c.value));
	if (topIdx === -1) topIdx = 0;
	const [topCard] = deck.splice(topIdx, 1);

	return {
		gameId,
		duelId,
		p1,
		p2,
		p1Hand,
		p2Hand,
		drawPile: deck,
		topCard,
		currentColor: topCard.color as Color,
		turn: p1,
		status: 'active',
		winnerId: null,
		createdAt: Date.now(),
		lastActivity: Date.now()
	};
}

export async function saveGame(game: UnoGame) {
	game.lastActivity = Date.now();
	await redis.set(`${PREFIX}${game.gameId}`, JSON.stringify(game), { EX: TTL });
}

export async function loadGame(gameId: string): Promise<UnoGame | null> {
	const raw = await redis.get(`${PREFIX}${gameId}`);
	return raw ? (JSON.parse(raw) as UnoGame) : null;
}

export async function deleteGame(gameId: string) {
	await redis.del(`${PREFIX}${gameId}`);
}

export function getHand(game: UnoGame, userId: number): UnoCard[] {
	return userId === game.p1 ? game.p1Hand : game.p2Hand;
}

function setHand(game: UnoGame, userId: number, hand: UnoCard[]) {
	if (userId === game.p1) game.p1Hand = hand;
	else game.p2Hand = hand;
}

export function opponent(game: UnoGame, userId: number) {
	return userId === game.p1 ? game.p2 : game.p1;
}

export function isPlayable(card: UnoCard, topCard: UnoCard, currentColor: Color): boolean {
	if (card.color === 'wild') return true;
	return card.color === currentColor || card.value === topCard.value;
}

// Returns error string or null on success
export function playCard(game: UnoGame, userId: number, cardId: string, chosenColor?: Color): string | null {
	if (game.status !== 'active') return 'Game is over';
	if (game.turn !== userId) return 'Not your turn';

	const hand = getHand(game, userId);
	const cardIdx = hand.findIndex((c) => c.id === cardId);
	if (cardIdx === -1) return 'Card not in hand';

	const card = hand[cardIdx];
	if (!isPlayable(card, game.topCard, game.currentColor)) return 'Card cannot be played';

	hand.splice(cardIdx, 1);
	setHand(game, userId, hand);
	game.topCard = card;

	if (card.color === 'wild') {
		if (!chosenColor || chosenColor === 'wild') return 'Must choose a color for wild card';
		game.currentColor = chosenColor;
	} else {
		game.currentColor = card.color;
	}

	// Check win
	if (hand.length === 0) {
		game.status = 'completed';
		game.winnerId = userId;
		return null;
	}

	const opp = opponent(game, userId);

	// Apply card effect
	switch (card.value) {
		case 'skip':
		case 'reverse': // 2-player reverse = skip
			game.turn = userId; // skip opponent, same player goes again
			break;
		case 'draw2': {
			drawCards(game, opp, 2);
			game.turn = userId;
			break;
		}
		case 'wild4': {
			drawCards(game, opp, 4);
			game.turn = userId;
			break;
		}
		default:
			game.turn = opp;
	}

	return null;
}

function drawCards(game: UnoGame, userId: number, count: number) {
	for (let i = 0; i < count; i++) {
		if (game.drawPile.length === 0) reshuffleDeck(game);
		if (game.drawPile.length === 0) break;
		const card = game.drawPile.shift()!;
		if (userId === game.p1) game.p1Hand.push(card);
		else game.p2Hand.push(card);
	}
}

function reshuffleDeck(game: UnoGame) {
	// Keep top card, reshuffle rest of discard back into draw pile
	// Since we only track topCard (not full discard pile), just generate fresh cards
	const newCards = buildDeck().filter((c) => c.id !== game.topCard.id);
	game.drawPile = newCards;
}

// Returns drawn card or null
export function drawOne(game: UnoGame, userId: number): UnoCard | null {
	if (game.status !== 'active') return null;
	if (game.turn !== userId) return null;

	if (game.drawPile.length === 0) reshuffleDeck(game);
	if (game.drawPile.length === 0) return null;

	const card = game.drawPile.shift()!;
	if (userId === game.p1) game.p1Hand.push(card);
	else game.p2Hand.push(card);

	game.turn = opponent(game, userId);
	return card;
}

// State visible to a specific player (hides opponent hand)
export function playerView(game: UnoGame, userId: number) {
	const myHand = getHand(game, userId);
	const oppHand = getHand(game, opponent(game, userId));
	return {
		gameId: game.gameId,
		myHand,
		opponentCardCount: oppHand.length,
		topCard: game.topCard,
		currentColor: game.currentColor,
		turn: game.turn,
		status: game.status,
		winnerId: game.winnerId,
		drawPileCount: game.drawPile.length,
		isMyTurn: game.turn === userId,
		p1: game.p1,
		p2: game.p2
	};
}
