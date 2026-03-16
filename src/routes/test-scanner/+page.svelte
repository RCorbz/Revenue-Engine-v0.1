<script lang="ts">
	import Scanner from '$lib/components/Scanner.svelte';
	import ScannerTestHarness from '$lib/components/ScannerTestHarness.svelte';
	import ScanReview from '$lib/components/ScanReview.svelte';

	let scanData: any = null;
	let mode: 'live' | 'test' = 'live';
	let isReviewing = false;

	function handleComplete(event: CustomEvent) {
		const data = event.detail;
		// BMADv6 Guardrail: ALWAYS route to High Density Review for user verification
		console.log(`⚠️ [ROUTING] Grounding Data. Forcing High Density Review Screen.`);
		scanData = data;
		isReviewing = true;
	}

	function handleVerified(event: CustomEvent) {
		console.log('✅ [INTAKE] Hand-Verified by User:', event.detail);
		scanData = event.detail;
		isReviewing = false;
	}

	function handleRescan() {
		scanData = null;
		isReviewing = false;
	}
</script>

<main class="min-h-screen bg-slate-950 text-white p-6 md:p-12 space-y-8">
    <header class="max-w-xl mx-auto space-y-2">
        <h1 class="text-3xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Identity Intake</h1>
        <p class="text-slate-400 text-sm">Scan Government ID to verify and pre-populate profile.</p>
    </header>

    <div class="max-w-xl mx-auto space-y-6">
        {#if !scanData}
            <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button 
                    class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {mode === 'live' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}"
                    on:click={() => mode = 'live'}
                >
                    LIVE CAMERA
                </button>
                <button 
                    class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {mode === 'test' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}"
                    on:click={() => mode = 'test'}
                >
                    DEBUG HARNESS
                </button>
            </div>

            {#if mode === 'live'}
                <Scanner on:complete={handleComplete} />
            {:else}
                <ScannerTestHarness on:test-complete={handleComplete} />
            {/if}
        {:else if isReviewing}
            <ScanReview 
                data={scanData} 
                on:verified={handleVerified} 
                on:rescan={handleRescan} 
            />
        {:else}
            <div class="bg-slate-900 rounded-3xl p-8 border border-slate-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 class="text-xl font-bold mb-4">Assessment Pipeline</h2>

                <div class="space-y-3">
                    <!-- 1. IDENTIFY CONFIRMED -->
                    <div class="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                            <span class="text-sm font-bold text-white flex items-center gap-2">
                                Identify Confirmed 
                                <span class="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">{scanData.firstName}</span>
                            </span>
                        </div>
                    </div>

                    <!-- 2. PRE-EXAM QUESTIONS -->
                    <button 
                        type="button" 
                        class="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] rounded-2xl border border-slate-700 group transition-all duration-200"
                        on:click={() => window.location.href = '/intake?step=2'}
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xs">2</div>
                            <span class="text-sm font-bold text-slate-200 group-hover:text-white">Start Pre-Exam Questions</span>
                        </div>
                        <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                    </button>

                    <!-- 3. MEDICAL EXAM -->
                    <div class="flex items-center gap-3 p-4 bg-slate-900/40 opacity-40 rounded-2xl border border-slate-800/50 cursor-not-allowed">
                        <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-700/30">3</div>
                        <span class="text-sm font-bold text-slate-500">Start Medical Exam</span>
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-800/50 flex gap-3">
                    <button 
                        class="text-center w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        on:click={handleRescan}
                    >
                        Back to Scanner
                    </button>
                    <button 
                        class="text-center w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        on:click={() => scanData = null}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        {/if}
    </div>
</main>

<style>
    :global(body) {
        background-color: #020617;
    }
</style>
