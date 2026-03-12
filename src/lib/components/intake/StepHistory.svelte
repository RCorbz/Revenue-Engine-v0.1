<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let historyFields: any[];
    export let currentHistoryIndex: number;
    export let formValues: Record<string, any>;

    function handleHistorySwipe(fieldKey: string, value: 'Yes' | 'No' | 'Unset') {
        formValues[fieldKey] = value;
        if (value === 'Yes') {
            setTimeout(() => {
                dispatch('advance');
            }, 300);
        }
    }

    function handleReason(fieldKey: string, reason: string) {
        formValues[`${fieldKey}_reason`] = reason;
        setTimeout(() => {
            dispatch('advance');
        }, 200);
    }
</script>

<div in:slide={{ axis: 'x', duration: 300 }} class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-reputation shadow-[0_0_8px_#ff9100] inline-block"></span>
            <h3 class="text-xs uppercase font-bold text-slate-300 tracking-widest">
                History
            </h3>
        </div>
        <span class="text-[10px] font-mono text-slate-500 tracking-widest bg-slate-900 px-2 py-1 rounded">
            {currentHistoryIndex + 1} / {historyFields.length}
        </span>
    </div>

    <div class="relative flex-grow flex items-center justify-center overflow-hidden">
        {#each historyFields as field, i (field.field_key)}
            {#if i === currentHistoryIndex}
                <div
                    in:fade={{ duration: 250, delay: 100 }}
                    out:fade={{ duration: 150 }}
                    class="absolute inset-x-2 inset-y-6 flex flex-col"
                >
                    <div class="bg-slate-900 flex-grow rounded-2xl border border-slate-700 shadow-[0_15px_40px_rgba(0,0,0,0.5)] p-6 flex flex-col justify-center">
                        <label
                            for={field.field_key}
                            class="mb-10 block text-center text-xl font-bold leading-relaxed text-slate-200"
                        >
                            {field.field_label}
                            {#if field.section !== 'Addon' && field.section !== 'Modular'}
                                <span class="text-reputation">*</span>
                            {/if}
                        </label>

                        <input type="hidden" name={field.field_key} value={formValues[field.field_key]} />
                        <input type="hidden" name="{field.field_key}_reason" value={formValues[`${field.field_key}_reason`] || ''} />

                        {#if formValues[field.field_key] === 'No'}
                            <div class="flex flex-col gap-3 w-full" in:fade>
                                <p class="text-xs text-red-400 text-center font-bold tracking-widest uppercase mb-2">
                                    Select Reason
                                </p>
                                <button
                                    type="button"
                                    class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
                                    on:click={() => handleReason(field.field_key, 'Prior Condition')}
                                >
                                    Prior Condition
                                </button>
                                <button
                                    type="button"
                                    class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
                                    on:click={() => handleReason(field.field_key, 'Current Issue')}
                                >
                                    Current Issue
                                </button>
                                <button
                                    type="button"
                                    class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
                                    on:click={() => handleReason(field.field_key, 'Symptomatic')}
                                >
                                    Symptomatic
                                </button>
                            </div>
                        {:else}
                            <div class="flex justify-between gap-6" in:fade>
                                <button
                                    type="button"
                                    class="flex-1 h-32 rounded-3xl border-2 border-red-500/30 bg-red-500/5 flex flex-col items-center justify-center gap-2 group hover:bg-red-500/20 transition-all active:scale-95"
                                    on:click={() => handleHistorySwipe(field.field_key, 'No')}
                                >
                                    <div class="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center text-red-500 text-2xl font-black group-hover:bg-red-500 group-hover:text-black transition">No</div>
                                    <span class="text-[10px] font-black tracking-widest text-red-400">SWIPE LEFT</span>
                                </button>

                                <button
                                    type="button"
                                    class="flex-1 h-32 rounded-3xl border-2 border-revenue/30 bg-revenue/5 flex flex-col items-center justify-center gap-2 group hover:bg-revenue/20 transition-all active:scale-95"
                                    on:click={() => handleHistorySwipe(field.field_key, 'Yes')}
                                >
                                    <div class="w-12 h-12 rounded-full border-2 border-revenue flex items-center justify-center text-revenue text-2xl font-black group-hover:bg-revenue group-hover:text-black transition">Yes</div>
                                    <span class="text-[10px] font-black tracking-widest text-revenue">SWIPE RIGHT</span>
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        {/each}
    </div>
</div>
