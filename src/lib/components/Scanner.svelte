<script lang="ts">
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { parseAAMVA } from '$lib/utils/aamva';
    import { compareIdentity } from '$lib/utils/compare';
    import { fade, scale } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    let video: HTMLVideoElement;
    let canvas: HTMLCanvasElement;
    let worker: Worker;
    let edgeWorker: Worker;
    
    let isNeuralLocked = false;
    let lockTimestamp: number | null = null;
    let focusScore = 0;
    
    type Phase = 'front' | 'back' | 'extracting';
    let phase: Phase = 'front';
    let status = "ALIGN FRONT OF ID";
    let isFailover = false;
    let startTime: number | null = null;
    let scanFrameId: number;
    let extractedData: any = {};
    let frontSideCaptureStart: number | null = null;
    
    // Performance Telemetry
    let ts_screenInit: number | null = null;
    let ts_frontCaptureTrigger: number | null = null;
    let ts_frontResponse: number | null = null;
    let ts_backScanStart: number | null = null;

    const rescanFront = () => {
        console.log('🔄 [SCANNER] User requested rescan of front.');
        phase = 'front';
        extractedData = null;
        status = "POSITION FRONT OF ID";
    };

    onMount(() => {
        ts_screenInit = performance.now();
        console.log('⚡ [EDGE ENGINE] Initializing Enterprise Intake...');
        
        // EDGE DETECTOR INITIALIZATION
        worker = new Worker(new URL('../workers/barcode.worker.ts', import.meta.url), { type: 'module' });
        edgeWorker = new Worker(new URL('../workers/edge-detector.worker.ts', import.meta.url), { type: 'module' });
        
        edgeWorker.onmessage = (e) => {
            if (phase !== 'front') return;
            
            const { isStable, focusScore: fs } = e.data;
            focusScore = fs;
            
            if (isStable) {
                if (!isNeuralLocked) {
                    isNeuralLocked = true;
                    lockTimestamp = Date.now();
                    if (navigator.vibrate) {
                        try { navigator.vibrate(50); } catch (e) { /* Silent fail on blocked vibration */ }
                    }
                } else if (lockTimestamp && Date.now() - lockTimestamp > 750) {
                    console.log('🎯 [NEURAL LOCK] Auto-triggering capture (Confidence high)');
                    captureSide('front');
                    isNeuralLocked = false;
                    lockTimestamp = null;
                }
            } else {
                isNeuralLocked = false;
                lockTimestamp = null;
            }
        };

        worker.onmessage = (e) => {
            if (e.data.success && phase === 'back') {
                console.log('✅ [EDGE ENGINE] PDF417 Detected & Decoded.');
                const parsed = parseAAMVA(e.data.text);
                if (parsed.idNumber) {
                    const comparison = compareIdentity(extractedData, parsed);
                    
                    // SMART MERGE: PRIORITIZE FRONT-SIDE DATA (Gemini 3.1 Neural Pass)
                    const mergedData = { ...extractedData };
                    for (const key in parsed) {
                        const newVal = parsed[key];
                        // Only fill in if front-side is missing AND back-side has valid data
                        const frontPathVal = mergedData[key];
                        const isFrontEmpty = !frontPathVal || frontPathVal === '' || frontPathVal === 'null' || frontPathVal === 'MISSING';
                        
                        if (isFrontEmpty && newVal && newVal !== '' && newVal !== 'null' && newVal !== 'MISSING') {
                            mergedData[key] = newVal;
                        }
                    }

                    const finalData = { 
                        ...mergedData, 
                        comparison,
                        source: 'edge-barcode' 
                    };
                    handleResult(finalData, 'edge');
                }
            }
        };

        worker.onerror = (err) => {
            console.error('❌ [EDGE ENGINE] Worker Error:', err);
        };

        startStream();
    });

    onDestroy(() => {
        if (scanFrameId) cancelAnimationFrame(scanFrameId);
        worker?.terminate();
        edgeWorker?.terminate();
        stopStream();
    });

    function stopStream() {
        if (video?.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    }

    async function startStream() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1920 } } 
            });
            if (video) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play().catch(console.error);
                    startTime = Date.now();
                    processFrame();
                };
            }
        } catch (err) {
            status = "CAMERA ACCESS DENIED";
            console.error('Camera Error:', err);
        }
    }

    async function captureSide(targetSide: 'front' | 'back') {
        if (targetSide === 'front') {
            frontSideCaptureStart = performance.now();
            ts_frontCaptureTrigger = performance.now();
            if (ts_screenInit) {
                console.log(`⏱️ [PERF] Initiation to Front Capture: ${Math.round(ts_frontCaptureTrigger - ts_screenInit)}ms`);
            }
        }
        console.log(`📸 [SCANNER] ${targetSide.toUpperCase()} capture initiated at: ${new Date().toISOString()}`);
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // SMART RESIZE: 1280px (720p equivalent) for optimal OCR/Neural balance
        const targetWidth = 1280;
        const scale = targetWidth / video.videoWidth;
        canvas.width = targetWidth;
        canvas.height = video.videoHeight * scale;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.90);
        
        phase = 'extracting';
        status = "PREPARING IMAGE...";
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 

        try {
            const res = await fetch('/intake/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({ 
                    image: base64,
                    side: targetSide 
                })
            });
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Server Error');
            }
            
            const result = await res.json();
            
            if (targetSide === 'front') {
                ts_frontResponse = performance.now();
                if (ts_frontCaptureTrigger) {
                    console.log(`⏱️ [PERF] Front side AI extraction latency: ${Math.round(ts_frontResponse - ts_frontCaptureTrigger)}ms`);
                }

                if (result.success && result.data && (result.data.firstName || result.data.idNumber)) {
                    // PERSISTENCE GUARD: We must explicitly save all fields to the component state
                    extractedData = { 
                        ...extractedData, 
                        ...result.data,
                        firstName: result.data.firstName || extractedData.firstName,
                        lastName: result.data.lastName || extractedData.lastName,
                        idNumber: result.data.idNumber || extractedData.idNumber,
                        dob: result.data.dob || extractedData.dob,
                        confidence: result.confidence_score || result.data.confidence || 0.5,
                        verificationStatus: result.data.verificationStatus || 'Unverified'
                    };
                    console.log(`🧠 [FRONT GROUNDING] Saved Persistent Front Data (Conf: ${extractedData.confidence}):`, extractedData);
                    
                    phase = 'back';
                    status = "BACK SIDE: ALIGN OR CAPTURE";
                    startTime = Date.now();
                    ts_backScanStart = performance.now();
                    console.log(`⏱️ [PERF] Barcode scan window opened at T+${Math.round(ts_backScanStart - ts_screenInit!)}ms`);
                } else {
                    status = "SCAN FAILED (DATA MISSING)";
                    console.warn('⚠️ [INTAKE] Front capture incomplete.');
                    phase = 'front';
                }
            } else {
                // BACK SIDE PROCESSING: Non-Destructive Merge (Front-Side Primacy)
                if (result.success && result.data) {
                    const mergedData = { 
                        ...extractedData,
                        // Only take fields from back that are missing in front
                        firstName: extractedData.firstName || result.data.firstName,
                        lastName: extractedData.lastName || result.data.lastName,
                        idNumber: extractedData.idNumber || result.data.idNumber,
                        dob: extractedData.dob || result.data.dob,
                        address: extractedData.address || result.data.address
                    };
                    
                    // Deep merge for nested objects if needed
                    if (result.data.physical) {
                        mergedData.physical = { ...extractedData.physical, ...result.data.physical };
                    }
                    if (result.data.licenseDetails) {
                        mergedData.licenseDetails = { ...extractedData.licenseDetails, ...result.data.licenseDetails };
                    }

                    console.log(`🧠 [BACK GROUNDING] Composite Record:`, mergedData);
                    handleResult(mergedData, 'cloud');
                } else {
                    status = "PROCESS FAILED (TRY AGAIN)";
                    phase = 'back';
                }
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            status = e.name === 'AbortError' ? "GATEWAY TIMEOUT" : "NETWORK ERROR (500)";
            console.error(`❌ [${targetSide.toUpperCase()} CLOUD] error:`, e);
            phase = targetSide;
        }
    }


    function processFrame() {
        if (!video || video.paused || phase === 'extracting') {
            scanFrameId = requestAnimationFrame(processFrame);
            return;
        }
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        if (phase === 'front') {
            // Neural Sampling for Front Side (640px for speed)
            const sampleWidth = 640;
            const sampleScale = sampleWidth / video.videoWidth;
            canvas.width = sampleWidth;
            canvas.height = video.videoHeight * sampleScale;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            edgeWorker.postMessage({
                imageData: imageData.data,
                width: canvas.width,
                height: canvas.height
            });

            status = isNeuralLocked ? "HOLD STEADY..." : "ALIGN FRONT OF ID";
        } else if (phase === 'back') {
            // "Sweet Spot" Targeted Barcode Capture - Increased area (60%)
            const scanHeight = video.videoHeight * 0.6;
            const scanTop = (video.videoHeight - scanHeight) / 2;
            
            // Set canvas size for barcode
            canvas.width = video.videoWidth * (640 / video.videoWidth); // match worker expectation
            canvas.height = scanHeight * (640 / video.videoWidth);

            ctx.drawImage(video, 0, scanTop, video.videoWidth, scanHeight, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            worker.postMessage({ 
                imageData: imageData.data, 
                width: canvas.width, 
                height: canvas.height 
            });

            if (startTime) {
                const elapsed = Date.now() - startTime;
                status = elapsed > 5000 ? "TAP BUTTON IF SCAN FAILS" : "ALIGN BARCODE";
            }
        }

        scanFrameId = requestAnimationFrame(processFrame);
    }

    function handleResult(data: any, resultSource: string) {
        if (scanFrameId) cancelAnimationFrame(scanFrameId);
        stopStream();
        if (navigator.vibrate) {
            try { navigator.vibrate(200); } catch (e) { /* Silent fail */ }
        }
        status = resultSource === 'edge' ? "BARCODE DECODED" : (resultSource === 'cloud' ? "AI VERIFIED" : "SCAN COMPLETED");
        
        // Final Identity Payload Construction
        const finalPayload = { 
            ...data, 
            source: data.source || resultSource // Prefer internal source if already set (e.g. 'timeout')
        };
        
        if (frontSideCaptureStart) {
            const totalDuration = Math.round(performance.now() - frontSideCaptureStart);
            console.log(`⏱️ [TOTAL] front side capture click to review scan present: ${totalDuration}ms`);
        }
        
        if (ts_backScanStart) {
            console.log(`⏱️ [PERF] Barcode start to present review screen: ${Math.round(performance.now() - ts_backScanStart)}ms`);
        }

        dispatch('complete', finalPayload);
    }
</script>

<div class="flex flex-col gap-6 w-full max-w-2xl mx-auto">
    <!-- 1. HUD / GUIDANCE AREA (Above Frame) -->
    <div class="flex justify-center h-12">
        {#if phase === 'front'}
            <div in:fade class="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <p class="text-[10px] text-white font-black uppercase tracking-[0.1em] whitespace-nowrap">FRONT: Align Corner of ID in box below</p>
            </div>
        {:else if phase === 'back'}
            <div in:fade class="px-6 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 backdrop-blur-xl flex items-center gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <p class="text-[10px] text-green-400 font-black uppercase tracking-[0.2em] whitespace-nowrap">Back of ID: Scan Barcode</p>
            </div>
        {:else if phase === 'extracting'}
            <div in:fade class="px-6 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl flex items-center gap-3">
                <div class="animate-spin h-3 w-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full"></div>
                <p class="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">{status}</p>
            </div>
        {/if}
    </div>

    <!-- 2. VIEWFINDER AREA -->
    <div class="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border-4 {phase === 'back' ? 'border-green-500/30' : (phase === 'front' ? 'border-white/20' : 'border-slate-800')} bg-black ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-500">
        <video bind:this={video} autoplay playsinline class="w-full h-full object-cover {phase === 'back' ? 'grayscale contrast-125 saturate-0' : ''}"></video>
        
        <!-- Viewfinder Overlays / Guides -->
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10">
            {#if phase === 'front'}
                <div in:fade class="w-full h-full border-2 border-white/5 rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)] relative overflow-hidden flex items-center justify-center">
                    <!-- STATIC WATERMARK (CENTERED FIT) -->
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        <span class="text-7xl font-black text-white opacity-10 uppercase tracking-[0.6em]">Front</span>
                    </div>

                    <!-- DIAGONAL GUIDANCE ARROWS (GREEN) -->
                    <!-- Standard Arrow Path (points Right 0deg): M5 12h14M12 5l7 7-7 7 -->
                    
                    <!-- Top Left -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {isNeuralLocked ? 'scale-125' : 'animate-arrow-nw'} z-10 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 {isNeuralLocked ? 'text-green-400 opacity-100' : 'text-green-500 opacity-80'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(-135deg);"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <!-- Top Right -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {isNeuralLocked ? 'scale-125' : 'animate-arrow-ne'} z-10 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 {isNeuralLocked ? 'text-green-400 opacity-100' : 'text-green-500 opacity-80'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(-45deg);"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <!-- Bottom Left -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {isNeuralLocked ? 'scale-125' : 'animate-arrow-sw'} z-10 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 {isNeuralLocked ? 'text-green-400 opacity-100' : 'text-green-500 opacity-80'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <!-- Bottom Right -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {isNeuralLocked ? 'scale-125' : 'animate-arrow-se'} z-10 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 {isNeuralLocked ? 'text-green-400 opacity-100' : 'text-green-500 opacity-80'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    
                    <!-- Guidance Scanline -->
                    <div class="absolute inset-0 bg-green-500/5 opacity-10"></div>
                </div>
            {:else if phase === 'back'}
                <div in:fade class="w-full h-1/2 border-2 border-dashed border-green-500/40 rounded-xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)] relative overflow-hidden">
                    <div class="absolute inset-0 bg-green-500/5 animate-pulse"></div>
                    <div class="h-0.5 w-full bg-green-500/40 absolute shadow-[0_0_20px_#22c55e] animate-scan-y"></div>
                </div>
            {/if}
        </div>

        <!-- Float-Status HUD -->
        {#if phase !== 'extracting'}
            <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-2xl font-mono text-[9px] font-bold tracking-[0.2em] uppercase border border-white/10 flex items-center gap-3 backdrop-blur-md">
                <span class="w-1.5 h-1.5 rounded-full {phase === 'front' ? 'bg-white' : 'bg-green-500'}"></span>
                {status}
            </div>
        {/if}
    </div>

    <!-- 3. CONTROL AREA / BOTTOM NAV -->
    <div class="bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col items-center gap-4">
        {#if phase === 'front'}
            <div in:scale={{ duration: 400, start: 0.8 }}>
                <button 
                    type="button" 
                    on:click={() => captureSide('front')}
                    aria-label="Capture Identity Front"
                    class="h-28 w-28 rounded-full border-[10px] border-white/10 bg-white/5 p-2 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 shadow-[0_0_60px_-15px_rgba(255,255,255,0.1)] group"
                >
                    <div class="h-full w-full bg-white rounded-full shadow-2xl group-hover:scale-105 transition-transform flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-black p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                </button>
            </div>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] text-center">Center Front & Tap to Capture</p>
        {:else if phase === 'back'}
            <div class="text-center space-y-8 w-full">
                <div class="flex flex-col items-center gap-6">
                    <!-- High-Impact Capture Button for Back Side -->
                    <button 
                        type="button" 
                        on:click={() => captureSide('back')}
                        aria-label="Capture Identity Back"
                        class="h-24 w-24 rounded-full border-[8px] border-green-500/20 bg-green-500/5 p-1.5 flex items-center justify-center hover:bg-green-500/10 transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(34,197,94,0.3)] group"
                    >
                        <div class="h-full w-full bg-green-500 rounded-full shadow-xl group-hover:scale-105 transition-transform flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                    </button>
                    
                    <div class="grid grid-cols-2 gap-4 w-full px-4">
                        <button 
                            on:click={rescanFront}
                            class="py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
                        >
                            Retake Front
                        </button>

                        <button 
                            on:click={() => handleResult({ ...extractedData, source: 'cloud-recovery' }, 'cloud')}
                            class="py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
                        >
                            Skip Back
                        </button>
                    </div>
                </div>
                <p class="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-medium leading-relaxed">
                    Auto-scanning Barcode... <br/> 
                    Or tap Green to capture manually
                </p>
            </div>
        {:else if phase === 'extracting'}
             <div class="py-12 flex flex-col items-center gap-6">
                 <div class="h-2 w-48 bg-white/5 rounded-full overflow-hidden">
                     <div class="h-full bg-blue-500 animate-progress-flow"></div>
                 </div>
                 <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Processing Cloud Neural Pass...</p>
             </div>
        {/if}
    </div>
</div>

<canvas bind:this={canvas} width="640" height="200" class="hidden"></canvas>

<style>
    video {
        transition: filter 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @keyframes scan-y {
        0%, 100% { transform: translateY(-40px); opacity: 0; }
        50% { transform: translateY(40px); opacity: 1; }
    }
    
    .animate-scan-y {
        animation: scan-y 2.5s infinite;
    }

    @keyframes arrow-nw { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(-120px, -60px) scale(1.2); opacity: 0; } }
    @keyframes arrow-ne { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(120px, -60px) scale(1.2); opacity: 0; } }
    @keyframes arrow-sw { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(-120px, 60px) scale(1.2); opacity: 0; } }
    @keyframes arrow-se { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(120px, 60px) scale(1.2); opacity: 0; } }

    .animate-arrow-nw { animation: arrow-nw 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .animate-arrow-ne { animation: arrow-ne 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .animate-arrow-sw { animation: arrow-sw 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .animate-arrow-se { animation: arrow-se 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

    @keyframes watermark-pulse {
        0%, 100% { opacity: 0.1; transform: scale(0.95); }
        50% { opacity: 0.3; transform: scale(1.05); }
    }

    .animate-watermark-pulse { animation: watermark-pulse 4s ease-in-out infinite; }
</style>
