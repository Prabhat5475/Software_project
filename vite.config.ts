import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/Software_project/",   // 👈 ADD THIS LINE (IMPORTANT)
  plugins: [react()],
});
