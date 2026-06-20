import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

await build({
  entryPoints: ['src/index.ts', 'src/cli.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'esm',
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['fsevents'],
  plugins: [
    nodeExternalsPlugin(),
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
