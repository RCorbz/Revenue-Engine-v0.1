<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let data: {
		driverName: string;
		dob: string;
		licenseNumber: string;
		address?: string;
	};

	export let fieldConfidences: Record<string, number> = {};

	function isLowConfidence(field: string) {
		return (fieldConfidences[field] || 1.0) < 0.9;
	}

	function handleConfirm() {
		dispatch('confirm', data);
	}

	function updateField(field: keyof typeof data, value: string) {
		data[field] = value;
	}
</script>

<div class="flex flex-col h-full space-y-4" in:fade>
	<div class="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-3">
		<span class="text-amber-500 text-lg">⚠</span>
		<div>
			<p class="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Review Required</p>
			<p class="text-[10px] text-slate-400">
				Some details were blurry. Please verify before proceeding.
			</p>
		</div>
	</div>

	<div class="space-y-3 overflow-y-auto pr-1">
		{#each Object.entries(data) as [key, value]}
			{#if key !== 'verificationStatus' && key !== 'address'}
				<div
					class="bg-slate-900 border {isLowConfidence(key)
						? 'border-amber-500/50'
						: 'border-slate-800'} p-3 rounded-xl transition-all"
				>
					<div class="flex justify-between items-center mb-1">
						<label
							for="review-{key}"
							class="text-[10px] text-slate-500 uppercase font-bold tracking-widest"
						>
							{key.replace(/([A-Z])/g, ' $1').trim()}
						</label>
						{#if isLowConfidence(key)}
							<span
								class="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black tracking-tighter uppercase"
								>Low Confidence</span
							>
						{:else}
							<span class="text-revenue text-[8px] font-black uppercase tracking-tighter"
								>Verified</span
							>
						{/if}
					</div>
					<input
						id="review-{key}"
						type="text"
						{value}
						on:input={(e) => updateField(key as any, e.currentTarget.value)}
						class="w-full bg-transparent border-none p-0 text-sm font-bold text-white focus:ring-0 placeholder-slate-600"
					/>
				</div>
			{/if}
		{/each}
	</div>

	<div class="mt-auto pt-6">
		<button
			type="button"
			on:click={handleConfirm}
			class="w-full h-14 bg-revenue text-slate-950 font-black tracking-[0.2em] text-sm uppercase rounded-2xl shadow-[0_10px_20px_rgba(0,200,83,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
		>
			Confirm & Proceed
		</button>
		<p class="text-center text-[10px] text-slate-600 mt-3 font-mono">
			OBT-20: Correction Protocol Active
		</p>
	</div>
</div>
