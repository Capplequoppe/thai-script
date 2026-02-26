import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/accelerated-learning/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@services": path.resolve(__dirname, ".."),
    },
  },
});
