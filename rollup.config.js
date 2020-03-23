import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';

import OMT from "@surma/rollup-plugin-off-main-thread";

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'esm',
		name: 'app',
		dir: 'dist'
	},
	plugins: [
		svelte({
			dev: true,
			css: css => {
				css.write('public/build/bundle.css');
			}
		}),

		OMT(),

		resolve({
			browser: true,
			dedupe: ['svelte']
		}),

		serve({
			contentBase: ['dist', 'public']
		}),
	],
	watch: {
		clearScreen: false
	}
};