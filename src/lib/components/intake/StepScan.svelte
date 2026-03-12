<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import Scanner from '$lib/components/Scanner.svelte';
    import ScanReview from '$lib/components/ScanReview.svelte';
    import type { IdentityData } from '$lib/utils/aamva';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let scannerResult: IdentityData | null = null;
    export let scanPhase: 'front' | 'back' | 'extracting' | 'review' | 'done' | 'manual' = 'front';
    export let verifySwipeProgress = 0;

    function handleScanComplete(event: CustomEvent) {
        scannerResult = event.detail;
        scanPhase = 'review';
        dispatch('update', { scannerResult, scanPhase });
    }

    function handleVerifySwipeChange(e: any) {
        verifySwipeProgress = parseInt(e.target.value);
        if (verifySwipeProgress > 95) {
            verifySwipeProgress = 100;
            dispatch('confirm');
        } else if (verifySwipeProgress < -95) {
            verifySwipeProgress = -100;
            scanPhase = 'manual';
            scannerResult = {
                firstName: '',
                lastName: '',
                driverName: '',
                idNumber: '',
                dob: '',
                licenseNumber: '',
                expirationDate: '',
                physical: {},
                licenseDetails: {},
                isExpired: false,
                source: 'manual'
            };
            dispatch('update', { scannerResult, scanPhase, verifySwipeProgress });
        }
    }

    function handleVerifySwipeEnd() {
        if (verifySwipeProgress > -95 && verifySwipeProgress < 95) {
            verifySwipeProgress = 0;
            dispatch('update', { verifySwipeProgress });
        }
    }

    function handleScanReview(event: CustomEvent) {
        const detail = event.detail;
        const result = { 
            ...scannerResult, 
            ...detail,
            driverName: `${detail.firstName || ''} ${detail.lastName || ''}`.trim(),
            licenseNumber: detail.idNumber
        };
        scannerResult = result as IdentityData;
        scanPhase = 'done';
        dispatch('update', { scannerResult, scanPhase });
    }

    function handleRescan() {
        scanPhase = 'front';
        scannerResult = null;
        dispatch('update', { scannerResult, scanPhase });
    }
</script>

<div out:slide={{ axis: 'x', duration: 300 }} class="flex flex-col h-full">
    <h1 class="text-xl">Identity Capture</h1>
    <p class="subtitle mt-1 text-[13px]">
        {#if scanPhase === 'front'}
            Take a clear photo of the <span class="text-white font-bold underline">FRONT</span> for extraction.
        {:else if scanPhase === 'back'}
            Securely capture the <span class="text-revenue font-bold underline">BARCODE</span> on the back.
        {:else if scanPhase === 'extracting'}
            Validating Identity Integrity...
        {:else if scanPhase === 'review'}
            Please confirm the extracted details.
        {:else if scanPhase === 'manual'}
            Manual Correction Mode
        {:else}
            Identity Verified.
        {/if}
    </p>

    <div class="flex-grow flex flex-col justify-center min-h-[350px]">
        {#if scanPhase === 'review' && scannerResult}
            <div in:fade={{ duration: 300 }}>
                <ScanReview 
                    data={scannerResult} 
                    on:verified={handleScanReview} 
                    on:rescan={handleRescan} 
                />
            </div>
        {:else if scanPhase === 'done' && scannerResult}
            <div class="flex flex-col items-center justify-center space-y-4 mb-6" in:fade>
                <div class="text-revenue text-4xl mb-2">✓</div>
                <p class="text-xs text-revenue font-mono font-bold tracking-widest uppercase">ID Authenticated</p>
            </div>

            <div class="bg-black/40 p-3 rounded-lg border border-revenue/30" in:fade>
                <div class="flex justify-between items-center mb-1 border-b border-slate-800 pb-1">
                    <p class="text-[10px] text-slate-500 font-mono">EXTRACTED IDENTITY MATCH</p>
                    <span
                        class="text-[8px] px-1.5 py-0.5 rounded {scannerResult.source === 'edge' || scannerResult.source === 'edge-barcode'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'} font-bold tracking-tighter uppercase"
                    >
                        {scannerResult.source?.toUpperCase() || 'SCAN'}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="overflow-hidden text-ellipsis whitespace-nowrap"><span class="text-slate-500">Name:</span> {scannerResult.driverName}</div>
                    <div><span class="text-slate-500">DL:</span> {scannerResult.licenseNumber}</div>
                    <div><span class="text-slate-500">DOB:</span> {scannerResult.dob}</div>
                    <div>
                        <span class="text-slate-500">Status:</span>
                        <span class="text-revenue">Verified</span>
                    </div>
                </div>
            </div>
        {:else if scanPhase === 'manual' && scannerResult}
            <div in:fade={{ duration: 300 }} class="space-y-4">
                <h3 class="text-sm font-bold text-center">Manual Identity Entry</h3>
                <div class="space-y-3">
                    <div class="space-y-1">
                        <label for="m-name" class="text-[10px] text-slate-500 uppercase font-black">Full Name</label>
                        <input id="m-name" type="text" bind:value={scannerResult.driverName} class="w-full bg-slate-900 border-slate-700 rounded-lg" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label for="m-dl" class="text-[10px] text-slate-500 uppercase font-black">DL Number</label>
                            <input id="m-dl" type="text" bind:value={scannerResult.licenseNumber} class="w-full bg-slate-900 border-slate-700 rounded-lg" />
                        </div>
                        <div class="space-y-1">
                            <label for="m-dob" class="text-[10px] text-slate-500 uppercase font-black">DOB</label>
                            <input id="m-dob" type="text" bind:value={scannerResult.dob} placeholder="YYYY-MM-DD" class="w-full bg-slate-900 border-slate-700 rounded-lg" />
                        </div>
                    </div>
                    <button 
                        class="w-full py-4 bg-revenue/20 text-revenue border border-revenue/40 font-black rounded-2xl mt-4 hover:bg-revenue/30 transition"
                        on:click={() => {
                            scanPhase = 'done';
                            dispatch('update', { scanPhase, scannerResult });
                        }}
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        {:else}
            <Scanner on:complete={handleScanComplete} />
        {/if}
    </div>

    <div class="mt-auto pt-4 relative">
        {#if scanPhase !== 'done'}
            <div class="w-full h-14 text-center p-[14px] text-slate-500 font-bold border-2 border-dashed border-slate-700 bg-slate-900/50 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center">
                {scanPhase === 'extracting' ? 'EXTRACTING...' : scanPhase === 'review' ? 'REVIEWING DETAILS' : 'CAPTURING ID'}
            </div>
        {:else}
            <div class="relative w-full h-14 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex items-center px-4 shadow-inner">
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span class="text-slate-400 font-bold tracking-widest text-[12px] uppercase z-20">Verify ID</span>
                    <div class="w-full h-full flex items-center justify-between px-6 text-[10px] text-slate-600 font-bold tracking-widest uppercase absolute">
                        <span class="bg-slate-900 pl-2">&lt;&lt; Manual</span>
                        <span class="bg-slate-900 pr-2">Confirm &gt;&gt;</span>
                    </div>
                </div>

                <div class="absolute left-1/2 top-0 bottom-0 bg-revenue/20 pointer-events-none transition-all duration-75" style="width: {verifySwipeProgress > 0 ? verifySwipeProgress + '%' : '0%'};"></div>
                <div class="absolute right-1/2 top-0 bottom-0 bg-red-500/20 pointer-events-none transition-all duration-75" style="width: {verifySwipeProgress < 0 ? Math.abs(verifySwipeProgress) + '%' : '0%'}"></div>

                <input
                    type="range"
                    min="-100"
                    max="100"
                    bind:value={verifySwipeProgress}
                    on:input={handleVerifySwipeChange}
                    on:change={handleVerifySwipeEnd}
                    on:touchend={handleVerifySwipeEnd}
                    on:mouseup={handleVerifySwipeEnd}
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div class="absolute h-10 w-10 bg-slate-700/80 backdrop-blur-sm rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none z-20 transition-all duration-75" style="left: calc(50% - 1.25rem); transform: translateX(calc({verifySwipeProgress} * (min(100vw - 4rem, 480px - 4rem) - 2.5rem) / 200))">
                    <svg class="w-6 h-6 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 9l-4 4 4 4m8-8l4 4-4 4" />
                    </svg>
                </div>
            </div>
        {/if}
    </div>
</div>
