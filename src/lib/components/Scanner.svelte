<script lang="ts">
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { parseAAMVA } from '$lib/utils/aamva';
    import { fade, scale } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    let video: HTMLVideoElement;
    let canvas: HTMLCanvasElement;
    let worker: Worker;
    
    type Phase = 'front' | 'back' | 'extracting';
    let phase: Phase = 'front';
    let status = "ALIGN FRONT OF ID";
    let isFailover = false;
    let startTime: number | null = null;
    let scanFrameId: number;
    let extractedData: any = {};

    onMount(() => {
        console.log('⚡ [EDGE ENGINE] Initializing Enterprise Intake...');
        
        // VITE-SAFE WORKER INITIALIZATION (Relative Path)
        worker = new Worker(new URL('../workers/barcode.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
            if (e.data.success && phase === 'back') {
                console.log('✅ [EDGE ENGINE] PDF417 Detected & Decoded.');
                const parsed = parseAAMVA(e.data.text);
                if (parsed.idNumber) {
                    // Correct potential data property naming mismatches (server vs local)
                    const data = {
                        firstName: parsed.firstName || extractedData.firstName,
                        lastName: parsed.lastName || extractedData.lastName,
                        idNumber: parsed.idNumber || extractedData.idNumber,
                        dob: parsed.dob || extractedData.dob,
                        source: 'barcode'
                    };
                    handleResult(data, 'edge');
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

    async function captureFront() {
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        console.log('📸 [PHASE 1: LOCAL CAPTURE] Taking High-Res Snap...');

        // Capture high-res frame for OCR
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.95);
        const imgSizeKB = Math.round(base64.length * 0.75 / 1024);
        console.log(`📸 [PHASE 1: SIZE] Front Frame: ${imgSizeKB}KB`);
        console.log('🚀 [PHASE 2: CLOUD UPLOAD] Sending Front Frame to DocAI Neural Pass...');
        
        try {
            const res = await fetch('/api/intake/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: base64.split(',')[1],
                    side: 'front' 
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Server Error');
            }
            
            const result = await res.json();
            
            if (result.success && result.data) {
                extractedData = result.data;
                console.log(`🧠 [PHASE 3: FRONT GROUNDING] Result Received (DocAI Entities: ${result.docAiEntityCount || 0}):`, extractedData);
                
                // AUTO-ADVANCE TO BACK SIDE
                phase = 'back';
                status = "FLIP ID: SCAN BARCODE";
                startTime = Date.now();
                
                // Reset canvas for high-performance barcode decoding
                canvas.width = 640;
                canvas.height = 200;
            } else {
                status = "SCAN FAILED (SIGNAL WEAK)";
                console.warn('⚠️ [INTAKE] Front capture empty. Resetting...');
                phase = 'front';
            }
        } catch (e) {
            status = "NETWORK ERROR (500)";
            console.error('❌ [FRONT CLOUD] Terminal error:', e);
            phase = 'front';
        }
    }

    function processFrame() {
        if (!video || video.paused || phase === 'extracting') {
            scanFrameId = requestAnimationFrame(processFrame);
            return;
        }
        
        if (phase === 'back') {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            // "Sweet Spot" Targeted Barcode Capture
            const scanHeight = video.videoHeight * 0.3;
            const scanTop = (video.videoHeight - scanHeight) / 2;
            
            ctx.drawImage(video, 0, scanTop, video.videoWidth, scanHeight, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            worker.postMessage({ 
                imageData: imageData.data, 
                width: canvas.width, 
                height: canvas.height 
            });

            if (startTime) {
                const elapsed = Date.now() - startTime;
                if (elapsed > 8000 && !isFailover) {
                    console.warn('⚠️ [WATERFALL] Edge Timeout. Falling back to Backside Cloud AI (Phase 2)...');
                    isFailover = true;
                    status = "NEURAL AI FALLBACK...";
                    
                    // 🛡️ CRITICAL: Recapture High-Res Full Frame for Cloud OCR
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    const cloudBase64 = canvas.toDataURL('image/jpeg', 0.95);
                    
                    triggerCloudBackside(cloudBase64);
                    
                    // Reset canvas for continued edge detection if needed (though isFailover stops it)
                    canvas.width = 640;
                    canvas.height = 200;
                } else if (!isFailover) {
                    status = elapsed > 4000 ? "MOVE BARCODE CLOSER" : "ALIGN BARCODE";
                }
            }
        }

        scanFrameId = requestAnimationFrame(processFrame);
    }

    async function triggerCloudBackside(base64: string) {
        const imgSizeKB = Math.round(base64.length * 0.75 / 1024);
        console.log(`📸 [PHASE 1: SIZE] Backside Frame: ${imgSizeKB}KB`);
        console.log('🚀 [PHASE 2: CLOUD UPLOAD] Sending Backside Frame to Backup Cloud AI...');
        try {
            const res = await fetch('/api/intake/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: base64.split(',')[1],
                    side: 'back'
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Server Error');
            }

            const result = await res.json();
            if (result.success && result.data) {
                // Merge data (barcode/back data takes priority for certain fields)
                console.log(`🧠 [PHASE 3: BACK GROUNDING] Result Received (DocAI Entities: ${result.docAiEntityCount || 0}):`, result.data);
                const finalData = { ...extractedData, ...result.data };
                handleResult(finalData, 'cloud');
            } else {
                status = "BACK SCAN FAILED. TRY AGAIN.";
                console.warn('⚠️ [INTAKE] Back capture empty.');
                isFailover = false;
                startTime = Date.now();
            }
        } catch (e) {
            status = "NETWORK ERROR (BACK)";
            console.error('❌ [BACK CLOUD] Terminal error:', e);
        }
    }

    function handleResult(data: any, source: string) {
        if (scanFrameId) cancelAnimationFrame(scanFrameId);
        stopStream();
        if (navigator.vibrate) navigator.vibrate(200);
        status = source === 'edge' ? "BARCODE DECODED" : "AI VERIFIED";
        dispatch('complete', { ...data, source });
    }
</script>

<div class="flex flex-col gap-6 w-full max-w-2xl mx-auto">
    <!-- 1. HUD / GUIDANCE AREA (Above Frame) -->
    <div class="flex justify-center h-12">
        {#if phase === 'front'}
            <div in:fade class="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <p class="text-[10px] text-white font-black uppercase tracking-[0.2em] whitespace-nowrap">Front of ID: Align in Box</p>
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
    <div class="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border-4 {isFailover ? 'border-blue-500' : (phase === 'front' ? 'border-white/20' : 'border-slate-800')} bg-black ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-500">
        <video bind:this={video} autoplay playsinline class="w-full h-full object-cover {phase === 'back' && !isFailover ? 'grayscale contrast-125 saturate-0' : ''}"></video>
        
        <!-- Viewfinder Overlays / Guides -->
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10">
            {#if phase === 'front'}
                <div in:fade class="w-full h-full border-2 border-white/30 rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)] relative">
                    <div class="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white/60 rounded-tl-xl"></div>
                    <div class="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white/60 rounded-tr-xl"></div>
                    <div class="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white/60 rounded-bl-xl"></div>
                    <div class="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white/60 rounded-br-xl"></div>
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
                    on:click={captureFront}
                    aria-label="Capture Identity Front"
                    class="h-28 w-28 rounded-full border-[10px] border-white/10 bg-white/5 p-2 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 shadow-[0_0_60px_-15px_rgba(255,255,255,0.1)] group"
                >
                    <div class="h-full w-full bg-white rounded-full shadow-2xl group-hover:scale-105 transition-transform flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-black p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                </button>
            </div>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] text-center">Center Document & Tap to Capture</p>
        {:else if phase === 'back'}
            <div class="text-center space-y-3 py-6">
                <div class="flex justify-center gap-1">
                    {#each Array(3) as _}
                        <div class="w-1 h-3 bg-green-500/20 rounded-full"></div>
                    {/each}
                </div>
                <p class="text-xs text-green-400 font-black uppercase tracking-widest animate-pulse">Edge Decoder Running</p>
                <p class="text-[10px] text-slate-600 uppercase tracking-widest">Targeting PDF417 Bounding Zone</p>
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
</style>
