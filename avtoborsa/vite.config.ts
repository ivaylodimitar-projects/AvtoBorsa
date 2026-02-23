import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendBaseUrl = env.BACKEND_BASE_URL || env.VITE_API_BASE_URL || "";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.BACKEND_BASE_URL": JSON.stringify(backendBaseUrl),
    },
  };
});
