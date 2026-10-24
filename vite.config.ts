import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  // Pre-bundle so first load doesn't re-optimize mid-session (caused a duplicate-React error).
  optimizeDeps: {
    include: ["recharts", "@tanstack/react-table", "papaparse"],
  },
});
