<script lang="ts">
    import { slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let formValues: Record<string, any>;
    export let historyFields: any[];
    export let swipeProgress = 0;

    $: missingVitals = [
        { key: 'blood_pressure_sys', label: 'BP Systolic' },
        { key: 'blood_pressure_dia', label: 'BP Diastolic' },
        { key: 'vision_acuity_right', label: 'Vision Right' },
        { key: 'vision_acuity_left', label: 'Vision Left' }
    ].filter(f => !formValues[f.key]);

    let lastLoggedIncrement = 0;

    function handleSwipeChange(e: any) {
        const val = parseInt(e.target.value);
        swipeProgress = val;
        
        const currentIncrement = Math.floor(val / 10) * 10;
        if (currentIncrement > lastLoggedIncrement) {
             console.log(`[StepConfirm] Swipe Progress: ${currentIncrement}%`);
             lastLoggedIncrement = currentIncrement;
        }

        if (val > 95) {
            console.log('[StepConfirm] 🚀 Triggering Submit via Slider!');
            swipeProgress = 100;
            dispatch('submit');
        }
    }
    
    function handleSwipeEnd() {
        if (swipeProgress <= 95) {
            swipeProgress = 0;
            lastLoggedIncrement = 0; // Reset increments log
        }
    }

</script>

<div in:slide={{ axis: 'x', duration: 300 }} class="flex flex-col h-full bg-slate-900/40 p-4 rounded-xl border border-revenue/20 overflow-y-auto custom-scrollbar">
    <h3 class="text-sm font-bold text-center mb-1">Final Review</h3>
    <p class="text-[11px] text-slate-400 text-center mb-4">
        Review your health snapshot. Swiping to submit will lock these values into the immutable vault.
    </p>

    <!-- Missing Fields Prompt Review -->

    {#if missingVitals.length > 0}
        <div class="mb-4 bg-amber-500/10 border border-amber-500/30 p-2 rounded flex flex-col gap-1 text-[11px]">
            <div class="font-bold text-amber-500 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Missing Field Notifications
            </div>
            <p class="text-slate-400">The PDF creator will fallback to empty strings or continuous simulations for the following nodes:</p>
            <div class="flex flex-wrap gap-1 mt-1">
                {#each missingVitals as field}
                    <span class="bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono text-[10px]">{field.label}</span>
                {/each}
            </div>
        </div>
    {/if}


    <div class="space-y-4 mb-auto">
        <div>
            <p class="text-[10px] text-slate-500 font-mono tracking-widest mb-1 border-b border-slate-800 pb-1">
                VITALS
            </p>
            <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-slate-950 p-2 rounded flex justify-between">
                    <span class="text-slate-500">BP Sys:</span>
                    <span class="font-mono text-revenue">{formValues['blood_pressure_sys']}</span>
                </div>
                <div class="bg-slate-950 p-2 rounded flex justify-between">
                    <span class="text-slate-500">BP Dia:</span>
                    <span class="font-mono text-revenue">{formValues['blood_pressure_dia']}</span>
                </div>
                <div class="bg-slate-950 p-2 rounded flex justify-between">
                    <span class="text-slate-500">Vis/R:</span>
                    <span class="font-mono text-revenue">{formValues['vision_acuity_right']}</span>
                </div>
                <div class="bg-slate-950 p-2 rounded flex justify-between">
                    <span class="text-slate-500">Vis/L:</span>
                    <span class="font-mono text-revenue">{formValues['vision_acuity_left']}</span>
                </div>
            </div>
        </div>

        <div>
            <p class="text-[10px] text-slate-500 font-mono tracking-widest mb-1 border-b border-slate-800 pb-1">
                HISTORY EXCEPTION FLAGS
            </p>
            <div class="bg-slate-950 p-3 rounded text-sm space-y-2">
                {#each historyFields.filter((f) => formValues[f.field_key] === 'No') as field}
                    <div class="flex justify-between items-start border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                        <span class="text-slate-400 text-xs">{field.field_label}</span>
                        <span class="text-red-400 text-xs font-bold text-right ml-2 bg-red-500/10 px-2 py-0.5 rounded">
                            {formValues[`${field.field_key}_reason`] || 'Flagged'}
                        </span>
                    </div>
                {:else}
                    <div class="text-center text-slate-500 text-xs py-2">
                        No history exceptions flagged.
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <div class="pt-4 mt-6">
        <div class="relative w-full h-14 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex items-center px-2 shadow-inner">
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="text-slate-500 font-bold tracking-widest text-[10px] uppercase">
                    >> CONFIRM & SUBMIT >>
                </span>
            </div>
            <div class="absolute left-0 top-0 bottom-0 bg-revenue/20 pointer-events-none transition-all duration-75" style="width: {swipeProgress}%"></div>

            <input
                type="range"
                min="0"
                max="100"
                bind:value={swipeProgress}
                on:input={handleSwipeChange}
                on:change={handleSwipeEnd}
                on:touchend={handleSwipeEnd}
                on:mouseup={handleSwipeEnd}
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            <div class="h-10 w-10 bg-revenue rounded-full shadow-[0_0_15px_rgba(0,200,83,0.5)] flex items-center justify-center pointer-events-none z-0 transition-all duration-75" style="transform: translateX(calc({swipeProgress} * (min(100vw - 4rem, 480px - 4rem) - 2.5rem) / 100))">
                <svg class="w-5 h-5 text-slate-950 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    </div>
</div>
