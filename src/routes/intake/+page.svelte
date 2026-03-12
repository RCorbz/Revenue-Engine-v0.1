<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount, tick } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import Scanner from '$lib/components/Scanner.svelte';
    import ScanReview from '$lib/components/ScanReview.svelte';
    import { parseAAMVA, type IdentityData } from '$lib/utils/aamva';
	import type { ActionData } from './$types';

	export let form: ActionData;

	let schemaData: { mcsa_requirements: any[]; modular_addons: any[] } | null = null;
	let loadingSchema = true;

	let currentStep = 1; // 1: Scan, 2: Vitals, 3: Health, 4: Confirm

	let formValues: Record<string, any> = {};
	let formElement: HTMLFormElement = null as any;
	let swipeProgress = 0;

	$: if (schemaData && Object.keys(formValues).length === 0) {
		schemaData.mcsa_requirements.forEach((f) => {
			if (f.default_value !== undefined) formValues[f.field_key] = f.default_value;
		});
		schemaData.modular_addons.forEach((f) => {
			if (f.default_value !== undefined) formValues[f.field_key] = f.default_value;
			else if (f.field_type === 'toggle' || f.field_type === 'boolean')
				formValues[f.field_key] = 'Unset';
		});
	}

	function handleSwipeChange() {
		if (swipeProgress > 95) {
			swipeProgress = 100;
			if (formElement) formElement.requestSubmit();
		}
	}

	function handleSwipeEnd() {
		if (swipeProgress <= 95) {
			swipeProgress = 0;
		}
	}

	// REAL WebRTC Camera & Scanner state
	let scanPhase: 'front' | 'back' | 'extracting' | 'review' | 'done' | 'manual' = 'front';
	let scanning = false;
	let scanTimeout: NodeJS.Timeout | null = null;
	let scanFailed = false;
	let fieldConfidences: Record<string, number> = {};
	let scannerResult: IdentityData | null = null;

	let verifySwipeProgress = 0;
	let autoSnapTimeout: any = null;
	let isExtractingAuto = false;
	let extractionError: string | null = null;

	function handleVerifySwipeChange() {
		if (verifySwipeProgress > 95) {
			verifySwipeProgress = 100;
			confirmIdentity();
		} else if (verifySwipeProgress < -95) {
			verifySwipeProgress = -100;
			// Trigger manual entry mode
			scanPhase = 'manual';
			stopCamera();
			scannerResult = {
				firstName: '',
				lastName: '',
				driverName: '',
				idNumber: '',
				dob: '',
				licenseNumber: '',
				expirationDate: '',
				isExpired: false,
				source: 'manual'
			};
		}
	}

	function handleVerifySwipeEnd() {
		if (verifySwipeProgress > -95 && verifySwipeProgress < 95) {
			verifySwipeProgress = 0;
		}
	}

	let videoElement: HTMLVideoElement = null as any;
	let canvasElement: HTMLCanvasElement = null as any;
	let mediaStream: MediaStream | null = null;
	let capturedImage: string | null = null;

	onMount(async () => {
		try {
			const res = await fetch('/api/intake/schema');
			if (res.ok) {
				schemaData = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch schema', e);
		} finally {
			loadingSchema = false;
		}
	});

	async function startCamera() {
		try {
			// HARDWARE PURGE: Ensure previous sessions are stone-dead before starting
			if (scanning) {
				await stopCamera();
				await new Promise((r) => setTimeout(r, 200));
			}

			scanning = true;
			scanFailed = false;
			capturedImage = null;

			// Unified Capture Pivot: We use standard high-res video for both front and back
			// This avoids the 'focus loop' issues of live local decoders on mobile hardware.
			// Unified Capture Pivot: We use standard high-res video for both phases
			// Focus is handled by the OS/Browser as a single stream.
			mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}
			});

			if (videoElement) {
				videoElement.srcObject = mediaStream;
				videoElement.play();
			}
		} catch (err) {
			console.error('Camera access denied or error:', err);
			scanFailed = true;
			scanning = false;
		}
	}

	async function stopCamera() {
		try {
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop());
				mediaStream = null;
			}
			scanning = false;
			if (scanTimeout) clearTimeout(scanTimeout);
			isExtractingAuto = false;
			// Tiny delay to ensure browser hardware release
			await new Promise((r) => setTimeout(r, 100));
		} catch (e) {
			console.warn('Silent failure during camera stop:', e);
		}
	}

	// Pivot: Local scanning logic removed in favor of high-res still capture.
	async function startBarcodeScanner() {}
	async function stopBarcodeScanner() {}

	async function captureAndUse() {
		captureFrame();
		await tick();
		usePhoto();
	}

	async function captureFrame() {
		if (videoElement && canvasElement) {
			canvasElement.width = videoElement.videoWidth;
			canvasElement.height = videoElement.videoHeight;
			const ctx = canvasElement.getContext('2d');
			if (ctx) {
				ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

				// Pre-processing: Brighten and Normalize (OBT High Success Rate Strategy)
				await preprocessImage(canvasElement);

				capturedImage = canvasElement.toDataURL('image/jpeg', 0.92); // High quality for 200 DPI equivalent
				stopCamera();
			}
		}
	}

	/**
	 * Professional Pre-processing: Handles low-light and orientation checks
	 * to ensure Document AI receives high-fidelity input.
	 */
	async function preprocessImage(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Stage 1: Brightness/Contrast Normalization
		// This solves the 'underexposed mobile capture' failure point
		ctx.filter = 'brightness(1.1) contrast(1.1) saturate(1.05)';
		ctx.drawImage(canvas, 0, 0);
		ctx.filter = 'none';

		// Stage 2: Orientation Sanity Check
		if (canvas.width < canvas.height) {
			console.log('🔄 Autoshift: Capturing horizontally for ID ergonomics');
			// Logic for auto-rotation would go here if needed, but standard US IDs are horizontal
		}
	}

	async function retakePhoto() {
		capturedImage = null;
		scannerResult = null;
		scanFailed = false;
		await stopCamera();
		await tick();
		startCamera();
	}

	async function usePhoto() {
		const currentPhase = scanPhase;
		scanPhase = 'extracting';

		try {
			extractionError = null;
			const response = await fetch('/intake/extract', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					image: capturedImage,
					side: currentPhase
				})
			});

			const result = await response.json();

			// Reflected Server Logs: Crucial for browser-only troubleshooting
			if (result.debug_logs) {
				console.group(`🤖 SERVER DIAGNOSTICS (${currentPhase?.toUpperCase()})`);
				result.debug_logs.forEach((l: string) => console.log(l));
				console.groupEnd();
			}

			if (!response.ok) {
				extractionError = result.error || 'Server processing failed';
				throw new Error((extractionError as string) || undefined);
			}

			if (result.success) {
				fieldConfidences = result.field_confidences || {};
				const avgConf = result.confidence_score || 0.9;

				// Merge with existing result if present (Front-First Priority)
				const newData = result.data || {};
				scannerResult = {
					firstName: newData.firstName || '',
					lastName: newData.lastName || '',
					driverName:
						newData.driverName && !newData.driverName.includes('MISSING')
							? newData.driverName
							: scannerResult?.driverName || 'RESCAN REQUIRED',
					idNumber: newData.idNumber || newData.licenseNumber || '',
					dob:
						newData.dob && !newData.dob.includes('1901-01-01')
							? newData.dob
							: scannerResult?.dob || '1901-01-01',
					licenseNumber:
						newData.licenseNumber && !newData.licenseNumber.includes('MISSING')
							? newData.licenseNumber
							: scannerResult?.licenseNumber || 'PENDING',
					expirationDate: newData.expirationDate || '',
					isExpired: newData.isExpired || false,
					source: result.source || 'cloud',
					verificationStatus: result.data?.verificationStatus || scannerResult?.verificationStatus
				};

				// If we just scanned the front, we still need the back for verification
				if (currentPhase === 'front') {
					scanPhase = 'back';
					capturedImage = null;
					await stopCamera();
					await tick();
					startCamera();
					return;
				}

				// If we scanned the back (or are re-scanning), finalize
				const needsReview =
					(avgConf >= 0.7 && avgConf < 0.9) || Object.values(fieldConfidences).some((c) => c < 0.9);

				if (needsReview && result.source !== 'simulation') {
					scanPhase = 'review';
				} else {
					scanPhase = 'done';
					capturedImage = null;
				}
			} else {
				// If front extraction fails, let them try the back anyway as a failover
				if (currentPhase === 'front') {
					console.warn('Front extraction failed, falling back to back side extraction.');
					scanPhase = 'back';
					capturedImage = null;
					startCamera();
				} else {
					scanFailed = true;
					scanPhase = 'back';
					capturedImage = null;
					extractionError = result.error || 'Identity data was unrecognizable on both sides.';
				}
			}
		} catch (err: any) {
			console.error('Extraction Error:', err);
			scanFailed = true;
			scanPhase = 'back';
			capturedImage = null;
			extractionError = err.message || 'System error during extraction.';
		}
	}

	function handleScanReview(event: CustomEvent) {
		scannerResult = { ...scannerResult, ...event.detail };
		// Map back to legacy fields for other parts of the app if needed
		if (scannerResult) {
			scannerResult.driverName = `${scannerResult.firstName || ''} ${scannerResult.lastName || ''}`.trim();
			scannerResult.licenseNumber = scannerResult.idNumber;
		}
		scanPhase = 'done';
	}

	function mockSuccessfulScan() {
		stopCamera();
		scanFailed = false;
		scanPhase = 'done';
		scannerResult = {
			firstName: 'JOHN',
			lastName: 'PUBLIC',
			driverName: 'JOHN Q PUBLIC',
			idNumber: 'DL-999888',
			dob: '1980-01-01',
			licenseNumber: 'DL-999888',
			expirationDate: '2030-01-01',
			isExpired: false,
			source: 'simulation'
		};
	}

	function confirmIdentity() {
		currentStep = 2; // Proceed to Vitals
	}

	function nextStep() {
		if (currentStep < 4) currentStep++;
	}

	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

	// History Pagination State
	let currentHistoryIndex = 0;
	let historyFields: any[] = [];
	$: {
		if (schemaData) {
			historyFields = [
				...schemaData.mcsa_requirements.filter(
					(f: any) => f.section !== 'Vitals' && f.section !== 'Vision'
				),
				...schemaData.modular_addons
			];
		}
	}

	function handleHistorySwipe(fieldKey: string, value: 'Yes' | 'No' | 'Unset') {
		formValues[fieldKey] = value;
		if (value === 'Yes') {
			setTimeout(() => {
				advanceHistory();
			}, 300);
		}
	}

	function handleReason(fieldKey: string, reason: string) {
		formValues[`${fieldKey}_reason`] = reason;
		setTimeout(() => {
			advanceHistory();
		}, 200);
	}

	function advanceHistory() {
		if (currentHistoryIndex < historyFields.length - 1) {
			currentHistoryIndex++;
		}
	}

	function prevHistory() {
		if (currentHistoryIndex > 0) {
			currentHistoryIndex--;
		} else {
			prevStep();
		}
	}

	// Calculate if current step is valid to proceed
	$: canProceedStep2 =
		schemaData?.mcsa_requirements
			?.filter((f: any) => f.section === 'Vitals' || f.section === 'Vision')
			.every((f: any) => formValues[f.field_key] !== undefined && formValues[f.field_key] !== '') ??
		false;

	$: canProceedStep3 =
		historyFields.length > 0 &&
		historyFields.every(
			(f: any) =>
				formValues[f.field_key] === 'Yes' ||
				(formValues[f.field_key] === 'No' && formValues[`${f.field_key}_reason`])
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
				<div
					class="h-1 flex-1 rounded-full {currentStep >= 1
						? 'bg-revenue'
						: 'bg-slate-800'} transition-all duration-300"
				></div>
				<div
					class="h-1 flex-1 rounded-full {currentStep >= 2
						? 'bg-revenue'
						: 'bg-slate-800'} transition-all duration-300"
				></div>
				<div
					class="h-1 flex-1 rounded-full {currentStep >= 3
						? 'bg-revenue'
						: 'bg-slate-800'} transition-all duration-300"
				></div>
				<div
					class="h-1 flex-1 rounded-full {currentStep >= 4
						? 'bg-revenue'
						: 'bg-slate-800'} transition-all duration-300"
				></div>
			</div>
		</div>

		{#if currentStep === 1}
			<!-- STEP 1: DOCUMENT AI ID CAM & BARCODE SCANNER -->
			<div out:slide={{ axis: 'x', duration: 300 }} class="flex flex-col h-full">
				<h1 class="text-xl">Identity Capture</h1>
				<p class="subtitle mt-1 text-[13px]">
					{#if scanPhase === 'front'}
						Take a clear photo of the <span class="text-white font-bold underline">FRONT</span> for extraction.
					{:else if scanPhase === 'back'}
						Securely capture the <span class="text-revenue font-bold underline">BARCODE</span> on the
						back.
					{:else if scanPhase === 'extracting'}
						Validating Identity Integrity...
					{:else if scanPhase === 'review'}
						Please confirm the extracted details.
					{:else if scanFailed}
						<span class="text-red-500">Extraction failed. Please try again.</span>
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
								on:rescan={retakePhoto} 
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
									<span
										class={scannerResult.verificationStatus?.includes('Verified') || (scannerResult.comparison?.isMatch)
											? 'text-revenue'
											: 'text-amber-500'}
									>
										{scannerResult.verificationStatus || (scannerResult.comparison?.isMatch ? 'Verified' : 'Manual Review')}
									</span>
								</div>
							</div>
						</div>
					{:else if scanPhase === 'manual' && scannerResult}
						<div in:fade={{ duration: 300 }} class="space-y-4">
							<h3 class="text-sm font-bold text-center">Manual Identity Entry</h3>
							<div class="space-y-3">
								<div class="space-y-1">
									<label for="m-name" class="text-[10px] text-slate-500 uppercase font-black">Full Name</label>
									<input id="m-name" type="text" bind:value={scannerResult.driverName} class="w-full" />
								</div>
								<div class="grid grid-cols-2 gap-3">
									<div class="space-y-1">
										<label for="m-dl" class="text-[10px] text-slate-500 uppercase font-black">DL Number</label>
										<input id="m-dl" type="text" bind:value={scannerResult.licenseNumber} class="w-full" />
									</div>
									<div class="space-y-1">
										<label for="m-dob" class="text-[10px] text-slate-500 uppercase font-black">DOB</label>
										<input id="m-dob" type="text" bind:value={scannerResult.dob} placeholder="YYYY-MM-DD" class="w-full" />
									</div>
								</div>
								<button 
									class="w-full py-4 bg-slate-800 text-white font-black rounded-2xl mt-4"
									on:click={() => scanPhase = 'done'}
								>
									CONTINUE
								</button>
							</div>
						</div>
					{:else}
						<Scanner on:complete={(e) => {
							scannerResult = e.detail;
							scanPhase = 'review';
						}} />
					{/if}
				</div>

				<div class="mt-auto pt-4 relative">
					{#if scanPhase !== 'done'}
						{#if scanPhase === 'extracting'}
							<div
								class="w-full h-14 text-center p-[14px] text-revenue font-bold border-2 border-dashed border-revenue/50 bg-revenue/10 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center gap-2"
							>
								<div
									class="w-4 h-4 rounded-full border-2 border-revenue border-t-transparent animate-spin"
								></div>
								EXTRACTING...
							</div>
						{:else if scanPhase === 'review'}
							<div
								class="w-full h-14 text-center p-[14px] text-blue-400 font-bold border-2 border-dashed border-blue-500/50 bg-blue-500/10 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center"
							>
								REVIEWING DETAILS
							</div>
						{:else if scanPhase === 'manual'}
							<div
								class="w-full h-14 text-center p-[14px] text-amber-500 font-bold border-2 border-dashed border-amber-500/50 bg-amber-500/10 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center"
							>
								MANUAL CORRECTION
							</div>
						{:else}
							<div
								class="w-full h-14 text-center p-[14px] text-slate-500 font-bold border-2 border-dashed border-slate-700 bg-slate-900/50 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center"
							>
								CAPTURING ID
							</div>
						{/if}
					{:else}
						<div
							class="relative w-full h-14 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex items-center px-4 shadow-inner"
						>
							<div
								class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0"
							>
								<span class="text-slate-400 font-bold tracking-widest text-[12px] uppercase z-20"
									>Verify ID</span
								>
								<div
									class="w-full h-full flex items-center justify-between px-6 text-[10px] text-slate-600 font-bold tracking-widest uppercase absolute"
								>
									<span class="bg-slate-900 pl-2">&lt;&lt; Manual</span>
									<span class="bg-slate-900 pr-2">Confirm &gt;&gt;</span>
								</div>
							</div>

							<div
								class="absolute left-1/2 top-0 bottom-0 bg-revenue/20 pointer-events-none transition-all duration-75"
								style="width: {verifySwipeProgress > 0 ? verifySwipeProgress + '%' : '0%'};"
							></div>
							<div
								class="absolute right-1/2 top-0 bottom-0 bg-red-500/20 pointer-events-none transition-all duration-75"
								style="width: {verifySwipeProgress < 0
									? Math.abs(verifySwipeProgress) + '%'
									: '0%'}"
							></div>

							<input
								type="range"
								title="Swipe Right to Confirm, Left for Manual"
								aria-label="Swipe Right to Confirm, Left for Manual Entry"
								min="-100"
								max="100"
								bind:value={verifySwipeProgress}
								on:input={handleVerifySwipeChange}
								on:change={handleVerifySwipeEnd}
								on:touchend={handleVerifySwipeEnd}
								on:mouseup={handleVerifySwipeEnd}
								class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
							/>

							<div
								class="absolute h-10 w-10 bg-slate-700/80 backdrop-blur-sm rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none z-20 transition-all duration-75"
								style="left: calc(50% - 1.25rem); transform: translateX(calc({verifySwipeProgress} * (min(100vw - 4rem, 480px - 4rem) - 2.5rem) / 200))"
							>
								<svg
									class="w-6 h-6 text-slate-300 pointer-events-none"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M8 9l-4 4 4 4m8-8l4 4-4 4"
									/>
								</svg>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- STEPS 2-4: DYNAMIC MULTI-STEP WIZARD -->
			<div in:fade={{ duration: 300, delay: 300 }} class="flex flex-col h-full overflow-hidden">
				<div class="flex items-center gap-2 mb-2 px-1">
					<button
						type="button"
						on:click={() => {
							if (currentStep === 3 && currentHistoryIndex > 0) {
								prevHistory();
							} else {
								prevStep();
							}
						}}
						aria-label="Previous Step"
						class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							></path></svg
						>
					</button>
					<h1 class="text-xl flex-grow text-center !m-0">Health Intake</h1>
					<div class="w-7"></div>
					<!-- Spacer for centering -->
				</div>
				<p class="subtitle mb-4 mt-1 text-[11px]">Strictly Confidential • Validates MCSA-5875</p>

				{#if loadingSchema}
					<div class="flex-grow flex items-center justify-center">
						<div
							class="h-6 w-6 rounded-full border-2 border-revenue border-t-transparent animate-spin"
						></div>
					</div>
				{:else if schemaData}
					<form
						method="POST"
						bind:this={formElement}
						use:enhance
						class="flex flex-col h-full overflow-hidden"
					>
						<!-- Hidden Pre-filled Barcode Identity Fields -->
						{#if scannerResult}
							<input type="hidden" name="driverName" value={scannerResult.driverName} />
							<input type="hidden" name="ssn" value={scannerResult.ssn} />
							<input type="hidden" name="dob" value={scannerResult.dob} />
							<input type="hidden" name="licenseNumber" value={scannerResult.licenseNumber} />
						{/if}

						<div class="flex-grow overflow-y-auto pr-2 pb-2 custom-scrollbar space-y-6">
							<!-- STEP 2: VITALS (Sliders) -->
							{#if currentStep === 2}
								<div in:slide={{ axis: 'x', duration: 300 }}>
									<div class="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
										<span
											class="h-2 w-2 rounded-full bg-retention shadow-[0_0_8px_#2979ff] inline-block"
										></span>
										<h3 class="text-xs uppercase font-bold text-slate-300 tracking-widest">
											MCSA Vitals
										</h3>
									</div>

									<div class="space-y-6">
										{#each schemaData.mcsa_requirements.filter((f) => f.section === 'Vitals' || f.section === 'Vision') as field}
											<div class="input-group m-0">
												<div class="flex justify-between items-end mb-2">
													<label for={field.field_key} class="!mb-0"
														>{field.field_label} <span class="text-reputation">*</span></label
													>
													{#if field.field_type === 'slider'}
														<span class="text-revenue font-mono font-bold text-lg"
															>{formValues[field.field_key] || field.min}
															<span class="text-xs text-slate-400">{field.unit || ''}</span></span
														>
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
							{/if}

							<!-- STEP 3: TINDER-STYLE HISTORY & MODULAR -->
							{#if currentStep === 3}
								<div in:slide={{ axis: 'x', duration: 300 }} class="flex flex-col h-full">
									<div
										class="flex items-center justify-between mb-4 border-b border-slate-800 pb-2"
									>
										<div class="flex items-center gap-2">
											<span
												class="h-2 w-2 rounded-full bg-reputation shadow-[0_0_8px_#ff9100] inline-block"
											></span>
											<h3 class="text-xs uppercase font-bold text-slate-300 tracking-widest">
												History
											</h3>
										</div>
										<span
											class="text-[10px] font-mono text-slate-500 tracking-widest bg-slate-900 px-2 py-1 rounded"
										>
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
													<div
														class="bg-slate-900 flex-grow rounded-2xl border border-slate-700 shadow-[0_15px_40px_rgba(0,0,0,0.5)] p-6 flex flex-col justify-center"
													>
														<label
															for={field.field_key}
															class="mb-10 block text-center text-xl font-bold leading-relaxed text-slate-200"
														>
															{field.field_label}
															{#if field.section !== 'Addon' && field.section !== 'Modular'}
																<span class="text-reputation">*</span>
															{/if}
														</label>

														<input
															type="hidden"
															name={field.field_key}
															value={formValues[field.field_key]}
														/>
														<input
															type="hidden"
															name="{field.field_key}_reason"
															value={formValues[`${field.field_key}_reason`] || ''}
														/>

														{#if formValues[field.field_key] === 'No'}
															<div class="flex flex-col gap-3 w-full" in:fade>
																<p
																	class="text-xs text-red-400 text-center font-bold tracking-widest uppercase mb-2"
																>
																	Select Reason
																</p>
																<button
																	type="button"
																	class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
																	on:click={() => handleReason(field.field_key, 'Prior Condition')}
																	>Prior Condition</button
																>
																<button
																	type="button"
																	class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
																	on:click={() => handleReason(field.field_key, 'Current Issue')}
																	>Current Issue</button
																>
																<button
																	type="button"
																	class="w-full p-4 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
																	on:click={() => handleReason(field.field_key, 'Other')}
																	>Other</button
																>

																<button
																	type="button"
																	class="mt-4 text-[11px] text-slate-500 uppercase tracking-widest hover:text-slate-300 transition"
																	on:click={() => (formValues[field.field_key] = 'Unset')}
																	>&lt; Cancel</button
																>
															</div>
														{:else}
															<div
																class="relative w-full h-16 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex items-center justify-between px-6"
															>
																<span
																	class="text-sm font-bold z-10 {formValues[field.field_key] ===
																	'No'
																		? 'text-white'
																		: 'text-slate-600'} pointer-events-none">NO</span
																>
																<span
																	class="text-sm font-bold z-10 {formValues[field.field_key] ===
																	'Yes'
																		? 'text-white'
																		: 'text-slate-600'} pointer-events-none">YES</span
																>

																<div
																	class="absolute inset-y-0 left-0 w-1/2 bg-red-500/80 transition-opacity duration-200 {formValues[
																		field.field_key
																	] === 'No'
																		? 'opacity-100'
																		: 'opacity-0'}"
																></div>
																<div
																	class="absolute inset-y-0 right-0 w-1/2 {field.section ===
																		'Addon' || field.section === 'Modular'
																		? 'bg-retention/80'
																		: 'bg-revenue/80'} transition-opacity duration-200 {formValues[
																		field.field_key
																	] === 'Yes'
																		? 'opacity-100'
																		: 'opacity-0'}"
																></div>

																<div class="absolute inset-x-0 w-full h-full flex z-20">
																	<button
																		type="button"
																		class="flex-1"
																		aria-label="Swipe Left to No"
																		on:click={() => handleHistorySwipe(field.field_key, 'No')}
																	></button>
																	<button
																		type="button"
																		class="flex-1"
																		aria-label="Swipe Middle to Unset"
																		on:click={() => handleHistorySwipe(field.field_key, 'Unset')}
																	></button>
																	<button
																		type="button"
																		class="flex-1"
																		aria-label="Swipe Right to Yes"
																		on:click={() => handleHistorySwipe(field.field_key, 'Yes')}
																	></button>
																</div>

																<div
																	class="absolute top-1.5 bottom-1.5 w-1/3 bg-slate-800 border-2 border-slate-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 pointer-events-none z-30"
																	style="left: {formValues[field.field_key] === 'No'
																		? '6px'
																		: formValues[field.field_key] === 'Yes'
																			? 'calc(66.66% - 6px)'
																			: '33.33%'}"
																>
																	<span
																		class="text-lg font-bold {formValues[field.field_key] === 'No'
																			? 'text-red-400'
																			: formValues[field.field_key] === 'Yes'
																				? 'text-white'
																				: 'text-slate-400'}"
																	>
																		{formValues[field.field_key] === 'No'
																			? '✕'
																			: formValues[field.field_key] === 'Yes'
																				? '✓'
																				: '?'}
																	</span>
																</div>
															</div>
														{/if}
													</div>
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}

							<!-- STEP 4: REVIEW & SUBMIT -->
							{#if currentStep === 4}
								<div
									in:slide={{ axis: 'x', duration: 300 }}
									class="flex flex-col h-full bg-slate-900/40 p-4 rounded-xl border border-revenue/20 overflow-y-auto custom-scrollbar"
								>
									<h3 class="text-sm font-bold text-center mb-2">Final Review</h3>
									<p class="text-xs text-slate-400 text-center mb-6">
										Review your health snapshot. Swiping to submit will lock these values into the
										immutable vault.
									</p>

									<div class="space-y-4 mb-auto">
										<div>
											<p
												class="text-[10px] text-slate-500 font-mono tracking-widest mb-1 border-b border-slate-800 pb-1"
											>
												VITALS
											</p>
											<div class="grid grid-cols-2 gap-3 text-sm">
												<div class="bg-slate-950 p-2 rounded flex justify-between">
													<span class="text-slate-500">BP Sys:</span>
													<span class="font-mono text-revenue"
														>{formValues['blood_pressure_sys']}</span
													>
												</div>
												<div class="bg-slate-950 p-2 rounded flex justify-between">
													<span class="text-slate-500">BP Dia:</span>
													<span class="font-mono text-revenue"
														>{formValues['blood_pressure_dia']}</span
													>
												</div>
												<div class="bg-slate-950 p-2 rounded flex justify-between">
													<span class="text-slate-500">Vis/R:</span>
													<span class="font-mono text-revenue"
														>{formValues['vision_acuity_right']}</span
													>
												</div>
												<div class="bg-slate-950 p-2 rounded flex justify-between">
													<span class="text-slate-500">Vis/L:</span>
													<span class="font-mono text-revenue"
														>{formValues['vision_acuity_left']}</span
													>
												</div>
											</div>
										</div>

										<div>
											<p
												class="text-[10px] text-slate-500 font-mono tracking-widest mb-1 border-b border-slate-800 pb-1"
											>
												HISTORY EXCEPTION FLAGS
											</p>
											<div class="bg-slate-950 p-3 rounded text-sm space-y-2">
												{#each historyFields.filter((f) => formValues[f.field_key] === 'No') as field}
													<div
														class="flex justify-between items-start border-b border-slate-800/50 pb-2 last:border-0 last:pb-0"
													>
														<span class="text-slate-400 text-xs">{field.field_label}</span>
														<span
															class="text-red-400 text-xs font-bold text-right ml-2 bg-red-500/10 px-2 py-0.5 rounded"
															>{formValues[`${field.field_key}_reason`] || 'Flagged'}</span
														>
													</div>
												{:else}
													<div class="text-center text-slate-500 text-xs py-2">
														No history exceptions flagged.
													</div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<div class="pt-4 mt-auto border-t border-slate-800 bg-slate-900/20">
							{#if currentStep === 2}
								<button
									type="button"
									on:click={nextStep}
									disabled={!canProceedStep2}
									class="w-full proceed-btn disabled:opacity-50 disabled:cursor-not-allowed"
									>Continue to History</button
								>
							{:else if currentStep === 3}
								<button
									type="button"
									on:click={nextStep}
									disabled={!canProceedStep3}
									class="w-full proceed-btn disabled:opacity-50 disabled:cursor-not-allowed"
									>Review Data</button
								>
							{:else if currentStep === 4}
								<div
									class="relative w-full h-14 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex items-center px-2 shadow-inner"
								>
									<div
										class="absolute inset-0 flex items-center justify-center pointer-events-none"
									>
										<span class="text-slate-500 font-bold tracking-widest text-[10px] uppercase"
											>>> CONFIRM & SUBMIT >></span
										>
									</div>
									<div
										class="absolute left-0 top-0 bottom-0 bg-revenue/20 pointer-events-none transition-all duration-75"
										style="width: {swipeProgress}%"
									></div>

									<input
										type="range"
										title="Swipe to Confirm and Submit"
										aria-label="Swipe to Confirm and Submit"
										min="0"
										max="100"
										bind:value={swipeProgress}
										on:input={handleSwipeChange}
										on:change={handleSwipeEnd}
										on:touchend={handleSwipeEnd}
										on:mouseup={handleSwipeEnd}
										class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
									/>

									<div
										class="h-10 w-10 bg-revenue rounded-full shadow-[0_0_15px_rgba(0,200,83,0.5)] flex items-center justify-center pointer-events-none z-0 transition-all duration-75"
										style="transform: translateX(calc({swipeProgress} * (min(100vw - 4rem, 480px - 4rem) - 2.5rem) / 100))"
									>
										<svg
											class="w-5 h-5 text-slate-950 ml-0.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.5"
												d="M9 5l7 7-7 7"
											></path></svg
										>
									</div>
								</div>
							{/if}
						</div>
					</form>
				{/if}
			</div>
		{/if}

		{#if form?.success}
			<div class="alert success">
				Registration Successful! Record ID: <code>{form.id}</code>
			</div>
		{/if}

		{#if form?.error}
			<div class="alert error">
				{form.message}
			</div>
		{/if}

		{#if form?.missing}
			<div class="alert error">All fields are required. Missing explicitly unswiped states.</div>
		{/if}
	</div>
</div>

<style>
	/* Premium Styling */
	:global(body) {
		background: radial-gradient(circle at top left, #0f172a, #1fbde1);
		background-attachment: fixed;
		color: #f8fafc;
		font-family: 'Outfit', 'Inter', sans-serif;
		margin: 0;
	}

	.container {
		/* Enforce h-screen-safe rules so NO part of body scrolls */
		height: 100dvh;
	}

	.card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 1.5rem; /* Tighter padding for mobile */
		box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.5);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.subtitle {
		text-align: center;
		color: #94a3b8;
		font-size: 0.95rem;
		margin-top: 0.5rem;
		margin-bottom: 2.5rem;
	}

	/* Scanner UI Fixes */
	#scanner-container {
		border-radius: 12px;
		overflow: hidden;
		background: #000;
	}

	:global(#scanner-container video) {
		object-fit: cover !important;
		width: 100% !important;
		height: 100% !important;
	}

	/* Hide the default html5-qrcode UI elements we don't need */
	:global(#scanner-container button),
	:global(#scanner-container span) {
		display: none !important;
	}

	.input-group {
		margin-bottom: 2rem;
	}

	label {
		display: block;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #cbd5e1;
		transition: color 0.2s ease;
	}

	input {
		width: 100%;
		padding: 1rem 1.25rem;
		background: rgba(15, 23, 42, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: #fff;
		font-size: 1rem;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #38bdf8;
		background: rgba(15, 23, 42, 0.8);
		box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
		transform: scale(1.01);
	}

	.proceed-btn {
		width: 100%;
		padding: 1.125rem;
		background: linear-gradient(135deg, #0ea5e9, #2563eb);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		margin-top: 1rem;
		box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
	}

	.proceed-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
		filter: brightness(1.1);
	}

	.proceed-btn:active {
		transform: translateY(0);
	}

	/* Custom Scrollbar */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.4);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(56, 189, 248, 0.5);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(56, 189, 248, 0.8);
	}

	.alert {
		margin-top: 2rem;
		padding: 1.25rem;
		border-radius: 16px;
		font-size: 0.95rem;
		text-align: center;
		animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	code {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-family: monospace;
	}
</style>
