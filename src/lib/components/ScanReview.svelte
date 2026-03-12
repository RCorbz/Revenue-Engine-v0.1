<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { maskPII } from '$lib/utils/format';
    import type { IdentityData } from '$lib/utils/aamva';
 
    export let data: IdentityData;

    const dispatch = createEventDispatcher();
    let isEditing = false;
    
    // Internal state for corrections
    $: localData = { ...data };
    $: if (data.comparison) console.log('[ScanReview] Cross-Verification:', data.comparison);

    function confirm() {
        dispatch('verified', localData);
    }

    function reScan() {
        dispatch('rescan');
    }
</script>

<div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
    <div class="flex items-center justify-between">
        <div class="space-y-1">
            <h2 class="text-xl font-bold tracking-tight">Review Identity</h2>
            <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                Source: {data.source}
            </p>
        </div>
        <div class="flex items-center gap-2">
            {#if data.isExpired}
                <span class="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">EXPIRED</span>
            {:else}
                <span class="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">VALID</span>
            {/if}
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4">
        <div class="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="first-name" class="text-[10px] text-slate-500 uppercase font-black">First Name</label>
                    <input id="first-name" type="text" bind:value={localData.firstName} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="last-name" class="text-[10px] text-slate-500 uppercase font-black">Last Name</label>
                    <input id="last-name" type="text" bind:value={localData.lastName} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="id-number" class="text-[10px] text-slate-500 uppercase font-black">ID Number</label>
                    <input id="id-number" type="text" bind:value={localData.idNumber} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="dob" class="text-[10px] text-slate-500 uppercase font-black">Date of Birth</label>
                    <input id="dob" type="text" bind:value={localData.dob} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
            </div>

            <div class="space-y-1">
                <label for="address" class="text-[10px] text-slate-500 uppercase font-black">Full Address</label>
                <input id="address" type="text" bind:value={localData.address} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="issue-date" class="text-[10px] text-slate-500 uppercase font-black">Issue Date</label>
                    <input id="issue-date" type="text" bind:value={localData.issueDate} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="exp-date" class="text-[10px] text-slate-500 uppercase font-black">Expiration Date</label>
                    <input id="exp-date" type="text" bind:value={localData.expirationDate} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
                <div class="space-y-1">
                    <label for="sex" class="text-[10px] text-slate-500 uppercase font-black">Sex</label>
                    <input id="sex" type="text" bind:value={localData.physical.sex} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="height" class="text-[10px] text-slate-500 uppercase font-black">Height</label>
                    <input id="height" type="text" bind:value={localData.physical.height} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="eyes" class="text-[10px] text-slate-500 uppercase font-black">Eyes</label>
                    <input id="eyes" type="text" bind:value={localData.physical.eyes} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                <div class="space-y-1">
                    <label for="class" class="text-[10px] text-slate-500 uppercase font-black">Class</label>
                    <input id="class" type="text" bind:value={localData.licenseDetails.class} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
                <div class="space-y-1">
                    <label for="restrictions" class="text-[10px] text-slate-500 uppercase font-black">Restrictions</label>
                    <input id="restrictions" type="text" bind:value={localData.licenseDetails.restrictions} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-sm py-1" />
                </div>
            </div>

            <div class="space-y-1">
                <label for="endorsements" class="text-[10px] text-slate-500 uppercase font-black">Endorsements</label>
                <input id="endorsements" type="text" bind:value={localData.licenseDetails.endorsements} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-xs py-1" />
            </div>

            <div class="space-y-1 border-t border-slate-800/50 pt-4">
                <label for="dd" class="text-[10px] text-slate-500 uppercase font-black">Document Discriminator (DD)</label>
                <input id="dd" type="text" bind:value={localData.documentDiscriminator} class="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none font-mono text-xs py-1" />
            </div>
        </div>
    </div>

    <div class="flex flex-col gap-3">
        <button 
            class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center space-x-2"
            on:click={confirm}
        >
            <span>CONFIRM IDENTITY</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        
        <button 
            class="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
            on:click={reScan}
        >
            RE-SCAN DOCUMENT
        </button>
    </div>
</div>
