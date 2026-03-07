import adapter from '@sveltejs/adapter-node'; // Switch from @sveltejs/adapter-auto
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			precompress: true // OBT-6: Essential for < 100ms latency
		}),
		alias: {
			$lib: './src/lib'
		}
	}
};

export default config;