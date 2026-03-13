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
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold">Verification Success</h2>
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest {scanData.source === 'edge' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}">
                        {scanData.source}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <span class="text-[10px] text-slate-500 uppercase font-black block">First Name</span>
                        <p class="font-mono text-sm">{scanData.firstName}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] text-slate-500 uppercase font-black block">Last Name</span>
                        <p class="font-mono text-sm">{scanData.lastName}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] text-slate-500 uppercase font-black block">ID Number</span>
                        <p class="font-mono text-sm">{scanData.idNumber}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] text-slate-500 uppercase font-black block">Date of Birth</span>
                        <p class="font-mono text-sm">{scanData.dob}</p>
                    </div>
                </div>

                {#if scanData.isExpired}
                    <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
                        ⚠️ THIS IDENTIFICATION IS EXPIRED
                    </div>
                {/if}

                <div class="flex gap-4">
                    <button 
                        class="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
                        on:click={handleRescan}
                    >
                        RE-SCAN
                    </button>
                    <button 
                        class="flex-1 py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-colors shadow-lg"
                        on:click={() => scanData = null}
                    >
                        DONE
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
