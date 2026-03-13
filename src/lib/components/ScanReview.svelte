<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { maskPII } from '$lib/utils/format';
    import type { IdentityData } from '$lib/utils/aamva';
 
    export let data: IdentityData;

    const dispatch = createEventDispatcher();
    let isEditing = false;
    
    // Internal state for corrections
    $: localData = { 
        ...data,
        physical: data.physical || {},
        licenseDetails: data.licenseDetails || {}
    };
    $: if (data.comparison) console.log('[ScanReview] Cross-Verification:', data.comparison);

    function confirm() {
        dispatch('verified', localData);
    }

    function reScan() {
        dispatch('rescan');
    }
</script>

<div class="bg-slate-900 rounded-[2rem] p-5 border border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
    <div class="flex items-center justify-between px-1">
        <div class="flex flex-col">
            <h2 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span class="w-2 h-4 bg-blue-500 rounded-full"></span>
                Review Identity
            </h2>
            <p class="text-xs text-slate-500 uppercase font-bold tracking-[0.2em]">Source: {data.source}</p>
        </div>
        <div class="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <span class="text-xs text-green-400 font-black uppercase tracking-widest">Authenticated</span>
        </div>
    </div>

    <!-- HIGH DENSITY GRID -->
    <div class="grid grid-cols-1 gap-3 overflow-hidden">
        
        <!-- ROW 1: NAMES -->
        <div class="grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
            <div class="flex flex-col gap-0.5">
                <label for="review-fn" class="text-xs text-slate-500 uppercase font-black tracking-widest">First Name</label>
                <input id="review-fn" bind:value={localData.firstName} class="bg-transparent text-xs font-bold text-white outline-none focus:text-blue-400 transition-colors" />
            </div>
            <div class="flex flex-col gap-0.5">
                <label for="review-ln" class="text-xs text-slate-500 uppercase font-black tracking-widest">Last Name</label>
                <input id="review-ln" bind:value={localData.lastName} class="bg-transparent text-xs font-bold text-white outline-none focus:text-blue-400 transition-colors" />
            </div>
        </div>

        <!-- ROW 2: CRITICAL IDS -->
        <div class="grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
            <div class="flex flex-col gap-0.5">
                <label for="review-id" class="text-xs text-slate-500 uppercase font-black tracking-widest">ID Number</label>
                <input id="review-id" bind:value={localData.idNumber} class="bg-transparent text-xs font-bold text-white outline-none focus:text-blue-400 transition-colors" />
            </div>
            <div class="flex flex-col gap-0.5">
                <label for="review-dob" class="text-xs text-slate-500 uppercase font-black tracking-widest">DOB</label>
                <input id="review-dob" bind:value={localData.dob} class="bg-transparent text-xs font-bold text-white outline-none focus:text-blue-400 transition-colors" />
            </div>
        </div>

        <!-- ROW 3: ADDRESS -->
        <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div class="flex flex-col gap-0.5">
                <label for="review-addr" class="text-xs text-slate-500 uppercase font-black tracking-widest">Full Address</label>
                <input id="review-addr" bind:value={localData.address} class="bg-transparent text-xs font-bold text-white outline-none w-full truncate focus:text-blue-400 transition-colors" />
            </div>
        </div>

        <!-- ROW 4: DATES & TRAITS (ULTRA COMPACT) -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col gap-0.5">
                <label for="review-issue" class="text-xs text-slate-500 uppercase font-black tracking-tighter">Issue</label>
                <input id="review-issue" bind:value={localData.issueDate} class="bg-transparent text-xs font-bold text-slate-300 outline-none" />
            </div>
            <div class="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col gap-0.5">
                <label for="review-exp" class="text-xs text-slate-500 uppercase font-black tracking-tighter">Expiry</label>
                <input id="review-exp" bind:value={localData.expirationDate} class="bg-transparent text-xs font-bold {data.isExpired ? 'text-red-400' : 'text-slate-300'} outline-none" />
            </div>
            <div class="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col gap-0.5 text-center">
                <label for="review-sex" class="text-xs text-slate-500 uppercase font-black tracking-tighter">Sex/HT</label>
                <div class="flex items-center justify-center gap-1 text-xs font-bold text-slate-300">
                    <input id="review-sex" bind:value={localData.physical.sex} class="bg-transparent w-4 text-center outline-none" />
                    <span>|</span>
                    <input id="review-ht" bind:value={localData.physical.height} class="bg-transparent w-8 text-center outline-none" />
                </div>
            </div>
        </div>

        <!-- ROW 5: LICENSE EXTRA (MINIMAL) -->
        <div class="grid grid-cols-2 gap-2">
            <div class="bg-white/5 rounded-xl px-3 py-2 border border-white/5 flex items-center justify-between">
                <label for="review-dd" class="text-xs text-slate-600 uppercase font-black">DD</label>
                <input id="review-dd" bind:value={localData.documentDiscriminator} class="bg-transparent text-xs font-mono text-slate-400 text-right outline-none w-2/3 truncate" />
            </div>
            <div class="bg-white/5 rounded-xl px-3 py-2 border border-white/5 flex items-center justify-between">
                <label for="review-class" class="text-xs text-slate-600 uppercase font-black">Class</label>
                <input id="review-class" bind:value={localData.licenseDetails.class} class="bg-transparent text-xs font-mono text-slate-400 text-right outline-none w-1/2" />
            </div>
        </div>
    </div>

    <!-- ACTION FOOTER (Zero Scroll) -->
    <div class="grid grid-cols-2 gap-3 pt-2">
        <button 
            class="py-4 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            on:click={reScan}
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
            Retake
        </button>
        
        <button 
            class="py-4 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-green-900/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            on:click={confirm}
        >
            Confirm
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
    </div>
</div>
