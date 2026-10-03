import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Codec War is 9597. Not 8080; 8080 is the lab.
// Standing rule: nothing binds the wildcard. This machine only, 127.0.0.1.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 9597,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 9596,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
