<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	// Reactive binding for the gauge animation
	$: percent = data.briefing.percent_to_target;
	$: isUnderTarget = data.briefing.current_aov < data.briefing.target_aov;
</script>

<svelte:head>
	<title>Revenue Analytics Dashboard</title>
</svelte:head>

<!-- OBT-6 Constraints: No-Scroll, Mobile First, h-screen-safe -->
<main class="h-screen-safe w-full flex flex-col items-center bg-slate-950 p-6 overflow-hidden">
	<!-- HEADER -->
	<header class="w-full max-w-md flex justify-between items-center mb-8 shrink-0 relative z-10">
		<div>
			<h1 class="text-2xl font-bold uppercase tracking-tighter text-white">
				Revenue <span class="text-retention">Engine</span>
			</h1>
			<p class="text-[10px] text-slate-400 font-mono tracking-widest mt-1">LIVE TELEMETRY</p>
		</div>
		<div
			class="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider
            {isUnderTarget ? 'bg-reputation/20 text-reputation' : 'bg-revenue/20 text-revenue'}"
		>
			{isUnderTarget ? 'PIVOT REQUIRED' : 'OPTIMIZED'}
		</div>
	</header>

	<!-- METRICS GRID -->
	<div class="w-full max-w-md grid grid-cols-2 gap-4 mb-8 shrink-0 relative z-10">
		<div
			class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center"
		>
			<span class="text-xs text-slate-500 font-mono uppercase mb-1">Gross (24h)</span>
			<span class="text-xl font-bold text-white"
				>${data.briefing.gross_revenue.toLocaleString(undefined, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})}</span
			>
		</div>
		<div
			class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center"
		>
			<span class="text-xs text-slate-500 font-mono uppercase mb-1">Transactions</span>
			<span class="text-xl font-bold text-white">{data.briefing.total_transactions}</span>
		</div>
	</div>

	<!-- AOV MAIN GAUGE (Fills available space) -->
	<div class="flex-grow w-full max-w-md flex flex-col items-center justify-center relative">
		<!-- Background Glow -->
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
			<div
				class="w-64 h-64 rounded-full blur-3xl
                {isUnderTarget ? 'bg-reputation' : 'bg-revenue'} transition-colors duration-1000"
			></div>
		</div>

		<!-- The Circular Gauge (CSS Conic Gradient) -->
		<div
			class="relative w-64 h-64 rounded-full flex items-center justify-center bg-slate-900 border-4 border-slate-950 shadow-2xl z-10"
			style="background: conic-gradient(var(--tw-gradient-stops)); 
                    --tw-gradient-from: {isUnderTarget
				? 'var(--color-reputation)'
				: 'var(--color-revenue)'} 0%; 
                    --tw-gradient-to: {isUnderTarget
				? 'var(--color-reputation)'
				: 'var(--color-revenue)'} {percent}%, 
                    transparent {percent}%, transparent 100%;"
		>
			<!-- Inner Black Circle -->
			<div
				class="absolute inset-[15px] rounded-full bg-slate-950 border border-slate-800 flex flex-col items-center justify-center"
			>
				<span class="text-slate-400 text-xs font-mono tracking-widest uppercase mb-1"
					>Current AOV</span
				>
				<span class="text-5xl font-black text-white tracking-tighter shadow-sm">
					${data.briefing.current_aov.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
				{#if percent > 0}
					<span class="text-[10px] text-slate-500 font-mono mt-2 bg-slate-900 px-2 py-1 rounded">
						TARGET: ${data.briefing.target_aov.toFixed(2)}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- AI STRATEGY & PROGRESS BAR -->
	<div class="w-full max-w-md mt-8 shrink-0 relative z-10 pb-4">
		<div class="flex justify-between items-end mb-2">
			<span class="text-xs text-slate-400 font-mono uppercase">Gap to Anchor</span>
			<span class="text-sm font-bold {isUnderTarget ? 'text-reputation' : 'text-revenue'}">
				${data.briefing.revenue_gap}
			</span>
		</div>

		<!-- Tailwind Progress Bar -->
		<div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-6">
			<div
				class="h-full rounded-full transition-all duration-1000 ease-out {isUnderTarget
					? 'bg-reputation'
					: 'bg-revenue'}"
				style="width: {percent}%"
			></div>
		</div>

		<!-- Vertex AI Output Card -->
		<div class="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 relative overflow-hidden">
			<div
				class="absolute top-0 left-0 w-1 h-full {isUnderTarget ? 'bg-reputation' : 'bg-revenue'}"
			></div>
			<div class="flex items-center gap-2 mb-2">
				<svg class="w-4 h-4 text-retention" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				<span class="text-[10px] text-retention font-mono font-bold tracking-wider"
					>VERTEX AI BRIEFING</span
				>
			</div>
			<p class="text-sm text-slate-300 leading-relaxed font-medium">
				{data.briefing.strategy_pivot}
			</p>
		</div>
	</div>
</main>
