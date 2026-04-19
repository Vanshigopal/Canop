import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@sentry/react"],
  },
  server: {
    port: 5173,
    host: true,
    // Allow any subdomain of lvh.me for dev multi-tenancy
    allowedHosts: ["localhost", ".lvh.me"],
  },
});
