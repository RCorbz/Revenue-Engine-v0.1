<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
	export let form: ActionData;

	// UI State
	let showRetentionDrawer = false;
	let selectedDriver: any = null;
    let loadingSms = false;

	// Reactive logic for the "Breathe" Effect
	$: percent = data.metrics.percentToTarget;
	$: isUnderTarget = data.metrics.currentAov < data.metrics.targetAov;

	function openRetention(driver: any) {
		selectedDriver = driver;
		showRetentionDrawer = true;
	}

	function closeRetention() {
		showRetentionDrawer = false;
		selectedDriver = null;
        loadingSms = false;
	}
</script>

<svelte:head>
	<title>Strategy Hub | Revenue Engine</title>
</svelte:head>

<!-- OBT-6 Constraints: No-Scroll, Mobile First, h-screen-safe -->
<main class="h-screen-safe w-full flex flex-col items-center bg-slate-950 p-6 overflow-hidden relative">
	<!-- HEADER -->
	<header class="w-full max-w-md flex justify-between items-center mb-6 shrink-0 relative z-10">
		<div>
			<h1 class="text-2xl font-bold uppercase tracking-tighter text-white">
				Revenue <span class="text-retention">Strategy</span>
			</h1>
			<p class="text-[10px] text-slate-400 font-mono tracking-widest mt-1">BI ENGINE v0.1</p>
		</div>
		<div
			class="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider animate-pulse
            {isUnderTarget ? 'bg-reputation/20 text-reputation' : 'bg-revenue/20 text-revenue'}"
		>
			{isUnderTarget ? 'PIVOT REQUIRED' : 'STABLE'}
		</div>
	</header>

	<!-- PRIMARY METRICS -->
	<div class="w-full max-w-md grid grid-cols-2 gap-3 mb-6 shrink-0 relative z-10">
		<div class="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 backdrop-blur-sm">
			<span class="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1 block">R-Run (Annual)</span>
			<span class="text-lg font-bold text-white tracking-tight">${data.metrics.runRate.toLocaleString()}</span>
		</div>
		<div class="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 backdrop-blur-sm">
			<span class="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1 block">Retention (Lookback)</span>
			<span class="text-lg font-bold text-white tracking-tight">{data.retention.totalAtRisk} Inactive</span>
		</div>
	</div>

	<!-- THE AOV ENGINE (Breathe Animation) -->
	<div class="flex-grow w-full max-w-md flex flex-col items-center justify-center relative">
		<!-- Dynamic Background Glow -->
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<div
				class="w-64 h-64 rounded-full blur-[80px] transition-all duration-1000
                {isUnderTarget ? 'bg-reputation/15 animate-breathe-slow' : 'bg-revenue/15 animate-breathe'}"
			></div>
		</div>

		<!-- Circular Gauge -->
		<div
			class="relative w-64 h-64 rounded-full flex items-center justify-center bg-slate-900 border-4 border-slate-950 shadow-2xl z-10
            {isUnderTarget ? 'border-reputation/20' : 'border-revenue/20'}"
			style="background: conic-gradient(
                {isUnderTarget ? 'var(--color-reputation)' : 'var(--color-revenue)'} 0%, 
                {isUnderTarget ? 'var(--color-reputation)' : 'var(--color-revenue)'} {percent}%, 
                transparent {percent}%, transparent 100%);"
		>
			<!-- Inner Black Circle -->
			<div class="absolute inset-[10px] rounded-full bg-slate-950 border border-white/5 flex flex-col items-center justify-center shadow-inner">
				<span class="text-slate-500 text-[10px] font-mono tracking-widest uppercase mb-1">Anchor Level</span>
				<span class="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
					${data.metrics.currentAov.toFixed(2)}
				</span>
				<div class="mt-2 flex flex-col items-center gap-1">
					<div class="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
						<div class="h-full bg-white/20 transition-all duration-1000" style="width: {percent}%"></div>
					</div>
					<span class="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
						TARGET: ${data.metrics.targetAov.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- AI STRATEGY & ACTIONS (DASH-6) -->
	<div class="w-full max-w-md mt-6 shrink-0 relative z-10 pb-8">
		<div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-4 relative overflow-hidden backdrop-blur-md">
			<div class="flex items-center gap-2 mb-3">
				<div class="w-2 h-2 rounded-full {isUnderTarget ? 'bg-reputation' : 'bg-revenue'} animate-ping"></div>
				<span class="text-[10px] text-white/70 font-mono font-bold tracking-widest uppercase">Strategy Alignment</span>
			</div>
			<p class="text-sm text-slate-200 leading-snug font-medium mb-4 italic">
				"{data.strategy.recommendation}"
			</p>
			
			<button 
				on:click={() => openRetention(data.retention.drivers[0])}
				class="w-full py-3 bg-white text-slate-950 rounded-xl font-bold text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-xl shadow-white/5"
			>
				Manage Inactive Drivers
			</button>
		</div>
        
        <!-- Bottom Stats Row -->
        <div class="flex justify-between items-center px-2">
            <div class="flex flex-col">
                <span class="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Gross Revenue</span>
                <span class="text-white font-bold tracking-tight">${data.metrics.grossRevenue.toLocaleString()}</span>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Transactions</span>
                <span class="text-white font-bold tracking-tight">{data.metrics.totalTransactions}</span>
            </div>
        </div>
	</div>

	<!-- RETENTION DRAWER (Slide-over) -->
	{#if showRetentionDrawer}
		<!-- Overlay -->
		<div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300" on:click={closeRetention}></div>
		
		<!-- Drawer Content -->
		<div class="absolute bottom-0 left-0 w-full bg-slate-900 rounded-t-[32px] p-8 z-50 border-t border-white/10 shadow-2xl transition-transform transform translate-y-0 flex flex-col h-[60vh] overflow-hidden">
			<div class="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6 shrink-0"></div>
			
			<h2 class="text-xl font-bold text-white mb-1">Retention Strategy</h2>
			<p class="text-xs text-slate-400 font-mono mb-6 uppercase tracking-wider">Driver Re-engagement Module</p>
			
			<div class="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
				{#each data.retention.drivers as driver}
					<div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center group active:bg-slate-800 transition-colors">
						<div>
							<h3 class="font-bold text-white text-sm">{driver.name}</h3>
							<p class="text-[10px] text-slate-500 font-mono uppercase mt-1">{driver.location} • {driver.daysInactive}d Inactive</p>
						</div>
						<form method="POST" action="?/generateSms" use:enhance={() => {
                            loadingSms = true;
                            selectedDriver = driver;
                            return async ({ update }) => {
                                loadingSms = false;
                                await update();
                            };
                        }}>
							<input type="hidden" name="driverName" value={driver.name} />
							<input type="hidden" name="daysInactive" value={driver.daysInactive} />
							<button class="w-10 h-10 rounded-full bg-retention/20 text-retention flex items-center justify-center hover:bg-retention/40 transition-colors">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
							</button>
						</form>
					</div>
				{/each}

				{#if form?.success && form.smsContent}
					<div class="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-5 mt-6 animate-in slide-in-from-bottom-4 duration-500">
						<span class="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest mb-2 block">AI Draft: {selectedDriver?.name}</span>
						<p class="text-sm text-slate-100 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-white/5 font-medium">
							"{form.smsContent}"
						</p>
						<button on:click={closeRetention} class="mt-4 text-[10px] text-blue-400 uppercase font-mono tracking-widest hover:text-white transition-colors">
							✓ Copy & Dispatch SMS
						</button>
					</div>
				{/if}
                
                {#if loadingSms}
                    <div class="flex items-center justify-center p-8 bg-slate-950/50 rounded-2xl border border-white/5 animate-pulse">
                        <span class="text-xs text-slate-500 font-mono tracking-widest uppercase">Drafting Strategy via Gemini...</span>
                    </div>
                {/if}
			</div>
            
            <!-- Bottom Spacer -->
            <div class="h-6 shrink-0"></div>
		</div>
	{/if}
</main>

<style>
	/* BMADv6 Aesthetics: Colors & Animations */
	:root {
		--color-revenue: #10b981; /* EMERALD-500 */
		--color-reputation: #ef4444; /* RED-500 */
		--color-retention: #fbbf24; /* AMBER-400 */
	}

	.text-retention { color: var(--color-retention); }
	.bg-retention { background-color: var(--color-retention); }
	.text-reputation { color: var(--color-reputation); }
	.bg-reputation { background-color: var(--color-reputation); }
	.text-revenue { color: var(--color-revenue); }
	.bg-revenue { background-color: var(--color-revenue); }

	@keyframes breathe {
		0%, 100% { transform: scale(1); opacity: 0.15; filter: blur(80px); }
		50% { transform: scale(1.15); opacity: 0.25; filter: blur(100px); }
	}

	@keyframes breathe-slow {
		0%, 100% { transform: scale(1); opacity: 0.1; filter: blur(80px); }
		50% { transform: scale(1.08); opacity: 0.2; filter: blur(95px); }
	}

	.animate-breathe { animation: breathe 6s ease-in-out infinite; }
	.animate-breathe-slow { animation: breathe-slow 8s ease-in-out infinite; }

	/* Custom Svelte Transitions */
	.animate-in {
		animation-duration: 0.5s;
		animation-fill-mode: both;
	}
	@keyframes slide-in-from-bottom {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
    
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1e293b;
        border-radius: 10px;
    }
</style>
