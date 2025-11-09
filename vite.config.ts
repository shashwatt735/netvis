/**
 * vite.config.ts - Vite Build Configuration
 *
 * Vite is our build tool - it:
 * - Compiles TypeScript to JavaScript
 * - Bundles React components
 * - Provides hot module reloading (instant updates while developing)
 * - Optimizes code for production
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // React plugin enables JSX and Fast Refresh
  plugins: [
    react(),
  ],

  // Path aliases for cleaner imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },

  // Development server configuration
  server: {
    port: 5173, // Default Vite port
    strictPort: true, // Fail if port is busy
    host: "localhost",
    open: false, // Don't open browser (Electron will open)
  },

  // Build configuration
  build: {
    outDir: "dist", // Output directory
    emptyOutDir: true, // Clean before build
    sourcemap: true, // Generate source maps for debugging

    // Rollup options (Vite uses Rollup for bundling)
    rollupOptions: {
      output: {
        // Code splitting for better performance
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "mui-vendor": ["@mui/material", "@emotion/react", "@emotion/styled"],
          "chart-vendor": ["recharts"],
        },
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "@mui/material", "recharts"],
  },

  // Base path (for production builds)
  base: "./",
});
