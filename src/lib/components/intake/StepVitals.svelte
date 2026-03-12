<script lang="ts">
    import { slide } from 'svelte/transition';

    export let schemaData: { mcsa_requirements: any[]; modular_addons: any[] };
    export let formValues: Record<string, any>;
</script>

<div in:slide={{ axis: 'x', duration: 300 }}>
    <div class="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
        <span class="h-2 w-2 rounded-full bg-retention shadow-[0_0_8px_#2979ff] inline-block"></span>
        <h3 class="text-xs uppercase font-bold text-slate-300 tracking-widest">
            MCSA Vitals
        </h3>
    </div>

    <div class="space-y-6">
        {#each schemaData.mcsa_requirements.filter((f) => f.section === 'Vitals' || f.section === 'Vision') as field}
            <div class="input-group m-0">
                <div class="flex justify-between items-end mb-2">
                    <label for={field.field_key} class="!mb-0 text-slate-300 text-sm">
                        {field.field_label} <span class="text-reputation">*</span>
                    </label>
                    {#if field.field_type === 'slider'}
                        <span class="text-revenue font-mono font-bold text-lg">
                            {formValues[field.field_key] || field.min}
                            <span class="text-xs text-slate-400">{field.unit || ''}</span>
                        </span>
                    {/if}
                </div>
                <input
                    type="range"
                    id={field.field_key}
                    name={field.field_key}
                    min={field.min}
                    max={field.max}
                    bind:value={formValues[field.field_key]}
                    class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-revenue mt-2 mb-4"
                />
            </div>
        {/each}
    </div>
</div>
