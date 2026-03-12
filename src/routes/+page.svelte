<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	// OBT-5: Reactive AI Briefing Store
	const briefing = writable({ current_aov: 0, revenue_gap: 0, strategy_pivot: 'Analyzing...' });
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch('/api/ai/briefing');
			if (response.ok) {
				const data = await response.json();
				briefing.set(data);
			}
		} catch (e) {
			console.error('OBT-5 Connection Failed');
		} finally {
			loading = false;
		}
	});

	const tiers = [
		{ name: 'Standard', price: 75, feat: 'Basic Compliance', color: 'slate-500' },
		{
			name: 'Professional',
			price: 125,
			feat: 'Full PHI Vault + AI',
			color: 'revenue',
			primary: true
		},
		{ name: 'Enterprise', price: 250, feat: 'Multi-Tenant Admin', color: 'retention' }
	];
</script>

<svelte:head>
	<title>Revenue Engine | Dashboard</title>
</svelte:head>

<main class="h-screen-safe flex flex-col bg-slate-950 text-white p-4">
	<header class="flex justify-between items-center py-4 border-b border-slate-800">
		<h1 class="text-xl font-bold tracking-tighter">REV<span class="text-revenue">ENGINE</span></h1>
		<div class="flex items-center gap-4">
			<a
				href="/dashboard"
				class="text-xs font-bold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700"
			>
				OPEN DASHBOARD
			</a>
			<div class="h-2 w-2 rounded-full bg-revenue animate-pulse"></div>
		</div>
	</header>

	<section class="flex-grow flex flex-col justify-center gap-6">
		<div class="space-y-2">
			<h2 class="text-3xl font-extrabold leading-none">
				Maximize Every <br /> <span class="text-revenue">Transaction.</span>
			</h2>
			<p class="text-slate-400 text-sm max-w-[280px]">
				Automated compliance and revenue gap analysis powered by Gemini 3.1 Pro.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-3">
			{#each tiers as tier}
				<a
					href={tier.primary ? "/test-scanner" : "#"}
					class="relative flex items-center justify-between p-4 rounded-xl border transition-all
          {tier.primary
						? 'border-revenue bg-revenue/10 scale-105 shadow-lg shadow-revenue/20'
						: 'border-slate-800 bg-slate-900/50'}"
				>
					<div class="text-left">
						<span
							class="text-xs uppercase font-bold tracking-widest {tier.primary
								? 'text-revenue'
								: 'text-slate-500'}"
						>
							{tier.name}
							{tier.primary ? '• Recommended' : ''}
						</span>
						<p class="text-lg font-bold">${tier.price}</p>
					</div>
					<span class="text-xs text-slate-400 italic">{tier.feat}</span>

					{#if tier.primary}
						<div
							class="absolute -top-2 -right-2 bg-revenue text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black"
						>
							POPULAR
						</div>
					{/if}
				</a>
			{/each}
		</div>
	</section>

	<footer class="py-4 px-2 bg-slate-900/80 rounded-t-2xl border-t border-slate-800">
		<div class="flex justify-between items-center mb-2">
			<span class="text-[10px] text-slate-500 uppercase tracking-widest"
				>System Grounded (OBT-11)</span
			>
			<span class="text-[10px] uppercase font-bold text-revenue">Audit Trail: Active</span>
		</div>

		<div class="bg-black/40 p-3 rounded-lg border border-slate-800/50">
			<p class="text-[9px] text-slate-500 mb-1">STRATEGY PIVOT (GEMINI 3.1 PRO):</p>
			{#if loading}
				<div class="h-3 w-32 bg-slate-800 animate-pulse rounded"></div>
			{:else}
				<p class="text-xs font-medium text-slate-200 leading-tight">
					{$briefing.strategy_pivot}
					<span class="block mt-1 text-revenue font-bold"
						>GAP TO $125 ANCHOR: ${$briefing.revenue_gap}</span
					>
				</p>
			{/if}
		</div>
	</footer>
</main>
