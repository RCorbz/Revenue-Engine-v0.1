<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import type { IdentityData } from '$lib/utils/aamva';
	import type { ActionData } from './$types';

    // Modular Components
    import StepScan from '$lib/components/intake/StepScan.svelte';
    import StepVitals from '$lib/components/intake/StepVitals.svelte';
    import StepHistory from '$lib/components/intake/StepHistory.svelte';
    import StepConfirm from '$lib/components/intake/StepConfirm.svelte';

	export let form: ActionData;

	let schemaData: { mcsa_requirements: any[]; modular_addons: any[] } | null = null;
	let loadingSchema = true;

	let currentStep = 1; // 1: Scan, 2: Vitals, 3: Health, 4: Confirm
	let formValues: Record<string, any> = {};
	let formElement: HTMLFormElement = null as any;

    // Phase 1 State
	let scanPhase: 'front' | 'back' | 'extracting' | 'review' | 'done' | 'manual' = 'front';
	let scannerResult: IdentityData | null = null;
	let verifySwipeProgress = 0;

    // Formatting fields for Step 3
	let currentHistoryIndex = 0;
	let historyFields: any[] = [];
	$: if (schemaData) {
        historyFields = [
            ...schemaData.mcsa_requirements.filter((f: any) => f.section !== 'Vitals' && f.section !== 'Vision'),
            ...schemaData.modular_addons
        ];
    }

	$: if (schemaData && Object.keys(formValues).length === 0) {
		schemaData.mcsa_requirements.forEach((f) => {
			if (f.default_value !== undefined) formValues[f.field_key] = f.default_value;
		});
		schemaData.modular_addons.forEach((f) => {
			if (f.default_value !== undefined) formValues[f.field_key] = f.default_value;
			else if (f.field_type === 'toggle' || f.field_type === 'boolean') formValues[f.field_key] = 'Unset';
		});
	}

	onMount(async () => {
		try {
			const res = await fetch('/api/intake/schema');
			if (res.ok) schemaData = await res.json();
		} catch (e) {
			console.error('Failed to fetch schema', e);
		} finally {
			loadingSchema = false;
		}
	});

	function handleScanUpdate(event: CustomEvent) {
		if (event.detail.scannerResult !== undefined) scannerResult = event.detail.scannerResult;
		if (event.detail.scanPhase !== undefined) scanPhase = event.detail.scanPhase;
		if (event.detail.verifySwipeProgress !== undefined) verifySwipeProgress = event.detail.verifySwipeProgress;
	}

	function confirmIdentity() {
		currentStep = 2;
	}

	function nextStep() {
		if (currentStep < 4) currentStep++;
	}

	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

    // Validation Logic
	$: canProceedStep2 = schemaData?.mcsa_requirements
        ?.filter((f: any) => f.section === 'Vitals' || f.section === 'Vision')
        .every((f: any) => formValues[f.field_key] !== undefined && formValues[f.field_key] !== '') ?? false;

	$: canProceedStep3 = historyFields.length > 0 && historyFields.every(
        (f: any) => formValues[f.field_key] === 'Yes' || (formValues[f.field_key] === 'No' && formValues[`${f.field_key}_reason`])
    );
</script>

<svelte:head>
	<title>Driver Intake | Revenue Engine</title>
</svelte:head>

<div class="container h-screen-safe w-full overflow-hidden flex flex-col justify-center">
	<div class="card relative flex flex-col h-full max-h-[85vh] overflow-hidden">
		
		<!-- PROGRESS INDICATOR -->
		<div class="flex justify-between items-center mb-6 px-1">
			<div class="flex gap-2 w-full">
				{#each [1, 2, 3, 4] as step}
					<div class="h-1 flex-1 rounded-full {currentStep >= step ? 'bg-revenue' : 'bg-slate-800'} transition-all duration-300"></div>
				{/each}
			</div>
		</div>

		{#if currentStep === 1}
			<StepScan 
                {scannerResult} 
                {scanPhase} 
                {verifySwipeProgress} 
                on:update={handleScanUpdate}
                on:confirm={confirmIdentity}
            />
		{:else}
			<div in:fade={{ duration: 300, delay: 300 }} class="flex flex-col h-full overflow-hidden">
				<div class="flex items-center gap-2 mb-2 px-1">
					<button
						type="button"
						on:click={() => {
							if (currentStep === 3 && currentHistoryIndex > 0) currentHistoryIndex--;
							else prevStep();
						}}
						class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
					</button>
					<h1 class="text-xl flex-grow text-center !m-0">Health Intake</h1>
					<div class="w-7"></div>
				</div>
				<p class="subtitle mb-4 mt-1 text-[11px]">Strictly Confidential • Validates MCSA-5875</p>

				{#if loadingSchema}
					<div class="flex-grow flex items-center justify-center">
						<div class="h-6 w-6 rounded-full border-2 border-revenue border-t-transparent animate-spin"></div>
					</div>
				{:else if schemaData}
					<form method="POST" bind:this={formElement} use:enhance class="flex flex-col h-full overflow-hidden">
						{#if scannerResult}
							<input type="hidden" name="driverName" value={scannerResult.driverName} />
							<input type="hidden" name="dob" value={scannerResult.dob} />
							<input type="hidden" name="licenseNumber" value={scannerResult.licenseNumber} />
						{/if}

						<div class="flex-grow overflow-y-auto pr-2 pb-2 custom-scrollbar space-y-6">
							{#if currentStep === 2}
								<StepVitals {schemaData} bind:formValues />
							{:else if currentStep === 3}
								<StepHistory 
                                    {historyFields} 
                                    bind:currentHistoryIndex 
                                    bind:formValues 
                                    on:advance={() => {
                                        if (currentHistoryIndex < historyFields.length - 1) currentHistoryIndex++;
                                    }}
                                />
							{:else if currentStep === 4}
								<StepConfirm {formValues} {historyFields} on:submit={() => formElement.requestSubmit()} />
							{/if}
						</div>

						{#if currentStep < 4}
							<div class="pt-4 mt-auto border-t border-slate-800 bg-slate-900/20">
								{#if currentStep === 2}
									<button type="button" on:click={nextStep} disabled={!canProceedStep2} class="w-full proceed-btn disabled:opacity-50">
                                        Continue to History
                                    </button>
								{:else if currentStep === 3}
									<button type="button" on:click={nextStep} disabled={!canProceedStep3} class="w-full proceed-btn disabled:opacity-50">
                                        Review Data
                                    </button>
								{/if}
							</div>
						{/if}
					</form>
				{/if}
			</div>
		{/if}

		{#if form?.success}
			<div class="alert success" in:fade>Registration Successful! Record ID: <code>{form.id}</code></div>
		{/if}
		{#if form?.error}
			<div class="alert error" in:fade>{form.message}</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background: radial-gradient(circle at top left, #0f172a, #1fbde1);
		background-attachment: fixed;
		color: #f8fafc;
		font-family: 'Outfit', 'Inter', sans-serif;
		margin: 0;
	}
	.container { height: 100dvh; }
	.card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 1.5rem;
		box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.5);
	}
	h1 { font-size: 1.5rem; font-weight: 700; }
	.subtitle {
		text-align: center;
		color: #94a3b8;
		font-size: 0.95rem;
		margin-top: 0.5rem;
		margin-bottom: 2.5rem;
	}
	.proceed-btn {
		width: 100%;
		padding: 1.125rem;
		background: linear-gradient(135deg, #0ea5e9, #2563eb);
		color: #fff;
		border-radius: 12px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
	}
	.custom-scrollbar::-webkit-scrollbar { width: 4px; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.5); border-radius: 4px; }
	.alert { margin-top: 2rem; padding: 1.25rem; border-radius: 16px; text-align: center; }
	.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
	.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
</style>
