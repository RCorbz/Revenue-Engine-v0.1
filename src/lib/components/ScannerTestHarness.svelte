<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { parseAAMVA } from '$lib/utils/aamva';

    const dispatch = createEventDispatcher();
    let files: FileList;
    let canvas: HTMLCanvasElement;
    let status = "UPLOAD IMAGE TO TEST";
    let isProcessing = false;

    async function handleFileChange() {
        if (!files || files.length === 0) return;
        const file = files[0];
        isProcessing = true;
        status = "PROCESSING IMAGE...";

        const img = new Image();
        img.onload = async () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Set canvas to image size
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Attempt Edge Processing simulation
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // In a real test we'd pipe this to the worker, but for simplicity 
            // the harness primarily tests the Cloud Fallback and AAMVA parser integrity.
            
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            triggerCloudAI(base64.split(',')[1]);
        };
        img.src = URL.createObjectURL(file);
    }

    async function triggerCloudAI(base64: string, useMock: boolean = false) {
        try {
            const res = await fetch('/intake/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: base64,
                    mock: useMock 
                })
            });
            const result = await res.json();
            if (result.success && result.verified) {
                status = "AI VERIFIED SUCCESS";
                dispatch('test-complete', result.data);
            } else {
                status = "AI FAILED TO VERIFY";
            }
        } catch (e) {
            status = "NETWORK ERROR";
        } finally {
            isProcessing = false;
        }
    }
</script>

<div class="p-6 bg-slate-900 rounded-2xl border border-slate-700 text-white space-y-4">
    <div class="flex items-center justify-between">
        <h3 class="font-bold tracking-tight">Identity Debug Harness</h3>
        <span class="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-mono uppercase">QA Mode</span>
    </div>

    <div class="border-2 border-dashed border-slate-700 rounded-xl p-8 transition-colors hover:border-blue-500/50 group bg-slate-950/50">
        <label class="flex flex-col items-center justify-center cursor-pointer space-y-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-slate-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span class="text-sm font-medium text-slate-400 group-hover:text-slate-200">Drop ID scan or click to upload</span>
            <input type="file" accept="image/*" bind:files on:change={handleFileChange} class="hidden" />
        </label>
    </div>

    {#if isProcessing}
        <div class="flex items-center space-x-3 text-blue-400 animate-pulse">
            <div class="w-2 h-2 bg-current rounded-full"></div>
            <span class="text-xs font-mono uppercase tracking-widest">{status}</span>
        </div>
    {:else}
        <div class="flex flex-col gap-3 pt-2">
            <div class="text-[10px] text-slate-500 font-mono uppercase tracking-widest text-center">
                {status}
            </div>
            
            <button 
                class="w-full py-3 bg-revenue/10 text-revenue border border-revenue/20 rounded-xl font-bold text-xs uppercase hover:bg-revenue/20 transition-all flex items-center justify-center gap-2"
                on:click={() => triggerCloudAI('', true)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                Run Mock Submission
            </button>
        </div>
    {/if}

    <canvas bind:this={canvas} class="hidden"></canvas>
</div>
