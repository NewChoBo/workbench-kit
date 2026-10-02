export default {
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: process.env.WORKBENCH_KIT_WATCH !== '1',
  sourcemap: true,
  splitting: false,
};
