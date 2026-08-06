export default {
  server: {
    port: 9090,
    host: "0.0.0.0",
    fs: {
      strict: false,
    },
  },
  build: {
    // three.js alone is ~540KB unminified-chunk/135KB gzipped — reasonable
    // for a 3D-heavy site and now isolated into its own cacheable chunk, so
    // the default 500KB warning is just noise at this point.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // three.js changes far less often than app code, so it's worth its
        // own cacheable chunk instead of being bundled with everything else.
        // Vite 8's Rolldown bundler requires the function form.
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
        },
      },
    },
  },
};
