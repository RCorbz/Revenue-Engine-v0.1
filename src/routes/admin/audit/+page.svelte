<script lang="ts">
	export let data;
</script>

<main class="h-screen-safe bg-slate-950 text-white p-6 font-mono overflow-y-auto">
	<div class="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
		<h1 class="text-xl font-bold uppercase tracking-tighter">
			Audit <span class="text-retention">Trail</span>
		</h1>
		<span class="text-[10px] bg-retention/20 text-retention px-2 py-1 rounded"
			>OBT-18 COMPLIANT</span
		>
	</div>

	<div class="space-y-3">
		{#each data.logs as log}
			<div class="p-4 bg-slate-900/50 border-l-2 border-retention rounded-r-xl text-[11px]">
				<div class="flex justify-between text-slate-500 mb-1">
					<span>[{log.timestamp}]</span>
					<span class="font-bold text-slate-300">{log.user}</span>
				</div>
				<p class="text-white">
					<span class="text-retention font-black uppercase">{log.action}:</span>
					{log.detail}
				</p>
			</div>
		{/each}
	</div>
</main>
