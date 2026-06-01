<script lang="ts">
	type Color = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
	type Value = string;

	const {
		color,
		value,
		faceDown = false,
		selected = false,
		playable = false,
		onclick
	}: {
		color: Color;
		value: Value;
		faceDown?: boolean;
		selected?: boolean;
		playable?: boolean;
		onclick?: () => void;
	} = $props();

	const BG: Record<Color, string> = {
		red: '#dc2626',
		green: '#16a34a',
		blue: '#2563eb',
		yellow: '#ca8a04',
		wild: '#111111'
	};

	const LABEL: Record<string, string> = {
		skip: '⊘',
		reverse: '⇄',
		draw2: '+2',
		wild: 'W',
		wild4: '+4'
	};

	const display = $derived(LABEL[value] ?? value);
	const bg = $derived(BG[color]);
</script>

<!-- 70×100 card -->
<button
	class="relative shrink-0 select-none rounded-xl transition-all duration-150 focus:outline-none
		{onclick ? 'cursor-pointer' : 'cursor-default'}
		{selected ? '-translate-y-4 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}
		{playable && !selected ? 'hover:-translate-y-2 hover:ring-2 hover:ring-white/60' : ''}
		{!playable && onclick ? 'opacity-50' : ''}"
	{onclick}
	disabled={!onclick}
	style="width:70px; height:100px;"
>
	{#if faceDown}
		<svg width="70" height="100" viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg">
			<rect width="70" height="100" rx="10" fill="#1e40af" />
			<rect x="4" y="4" width="62" height="92" rx="8" fill="none" stroke="#3b82f6" stroke-width="2" />
			<!-- diagonal stripes -->
			<clipPath id="clip-back">
				<rect x="4" y="4" width="62" height="92" rx="8" />
			</clipPath>
			<g clip-path="url(#clip-back)" opacity="0.3">
				{#each Array(20) as _, i}
					<line x1={i * 8 - 20} y1="0" x2={i * 8 + 60} y2="100" stroke="#93c5fd" stroke-width="3" />
				{/each}
			</g>
			<ellipse cx="35" cy="50" rx="18" ry="26" fill="none" stroke="#60a5fa" stroke-width="2" transform="rotate(-30 35 50)" />
			<text x="35" y="55" text-anchor="middle" font-size="14" font-weight="900" fill="#60a5fa" font-family="system-ui">UNO</text>
		</svg>
	{:else if color === 'wild'}
		<svg width="70" height="100" viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg">
			<rect width="70" height="100" rx="10" fill="#111" />
			<!-- Four color quadrants clipped to card -->
			<clipPath id="card-clip-{value}">
				<rect width="70" height="100" rx="10" />
			</clipPath>
			<g clip-path="url(#card-clip-{value})">
				<path d="M0,0 L70,0 L35,50 Z" fill="#dc2626" />
				<path d="M70,0 L70,100 L35,50 Z" fill="#2563eb" />
				<path d="M70,100 L0,100 L35,50 Z" fill="#ca8a04" />
				<path d="M0,100 L0,0 L35,50 Z" fill="#16a34a" />
			</g>
			<rect width="70" height="100" rx="10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
			<!-- Center oval -->
			<ellipse cx="35" cy="50" rx="20" ry="28" fill="black" transform="rotate(-25 35 50)" />
			<text x="35" y="55" text-anchor="middle" font-size="{value === 'wild4' ? '15' : '13'}" font-weight="900" fill="white" font-family="system-ui">{display}</text>
		</svg>
	{:else}
		<svg width="70" height="100" viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg">
			<!-- Card background -->
			<rect width="70" height="100" rx="10" fill={bg} />
			<rect x="3" y="3" width="64" height="94" rx="8" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
			<!-- Inner white oval -->
			<ellipse cx="35" cy="50" rx="22" ry="32" fill="white" fill-opacity="0.92" transform="rotate(-25 35 50)" />
			<!-- Center value -->
			<text x="35" y="56" text-anchor="middle" font-size="{display.length > 2 ? '16' : '24'}" font-weight="900" fill={bg} font-family="system-ui">{display}</text>
			<!-- Top-left corner -->
			<text x="7" y="18" font-size="12" font-weight="700" fill="white" font-family="system-ui">{display}</text>
			<!-- Bottom-right corner (rotated 180°) -->
			<text x="63" y="90" font-size="12" font-weight="700" fill="white" font-family="system-ui" transform="rotate(180 63 87)">{display}</text>
		</svg>
	{/if}
</button>
