import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `npm run dev` has no Vercel runtime, so this tiny plugin serves /api/settings/theme with the
// same handler used in production (api/settings/theme.js), storing the theme in .theme-data/.
const themeApiDev = () => ({
  name: "theme-api-dev",
  configureServer(server) {
    server.middlewares.use("/api/settings/theme", async (req, res) => {
      const { default: handler } = await server.ssrLoadModule("/api/settings/theme.js");
      await handler(req, res);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), themeApiDev()],
});
