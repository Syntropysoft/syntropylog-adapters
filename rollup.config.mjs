import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import pkg from './package.json' with { type: 'json' };

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'syntropylog',
];

const jsPlugins = [
  resolve(),
  commonjs(),
  typescript({ 
    tsconfig: './tsconfig.json',
    sourceMap: true,
    module: 'ESNext',
  }),
  json(),
];

export default [
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // Brokers subpath
  {
    input: 'src/brokers/index.ts',
    output: [
      {
        file: 'dist/brokers/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/brokers/index.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // HTTP subpath
  {
    input: 'src/http/index.ts',
    output: [
      {
        file: 'dist/http/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/http/index.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // Serializers subpath
  {
    input: 'src/serializers/index.ts',
    output: [
      {
        file: 'dist/serializers/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/serializers/index.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // AWS subpath
  {
    input: 'src/aws/index.ts',
    output: [
      {
        file: 'dist/aws/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/aws/index.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // Individual AWS adapters for tree shaking
  {
    input: 'src/aws/CloudWatchAdapter.ts',
    output: [
      {
        file: 'dist/aws/CloudWatchAdapter.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/aws/CloudWatchAdapter.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  {
    input: 'src/aws/XRayAdapter.ts',
    output: [
      {
        file: 'dist/aws/XRayAdapter.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/aws/XRayAdapter.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  {
    input: 'src/aws/S3Adapter.ts',
    output: [
      {
        file: 'dist/aws/S3Adapter.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/aws/S3Adapter.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  {
    input: 'src/aws/MQTTAdapter.ts',
    output: [
      {
        file: 'dist/aws/MQTTAdapter.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/aws/MQTTAdapter.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // Types subpath
  {
    input: 'src/types.ts',
    output: [
      {
        file: 'dist/types.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/types.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: jsPlugins,
  },
  // Type definitions
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/brokers/index.d.ts',
    output: [{ file: 'dist/brokers/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/http/index.d.ts',
    output: [{ file: 'dist/http/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/serializers/index.d.ts',
    output: [{ file: 'dist/serializers/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/aws/index.d.ts',
    output: [{ file: 'dist/aws/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/aws/CloudWatchAdapter.d.ts',
    output: [{ file: 'dist/aws/CloudWatchAdapter.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/aws/XRayAdapter.d.ts',
    output: [{ file: 'dist/aws/XRayAdapter.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/aws/S3Adapter.d.ts',
    output: [{ file: 'dist/aws/S3Adapter.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/aws/MQTTAdapter.d.ts',
    output: [{ file: 'dist/aws/MQTTAdapter.d.ts', format: 'es' }],
    plugins: [dts()],
  },
  {
    input: 'dist/types/types.d.ts',
    output: [{ file: 'dist/types.d.ts', format: 'es' }],
    plugins: [dts()],
  },
]; 