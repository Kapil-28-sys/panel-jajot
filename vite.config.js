import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `npm run dev` has no Vercel runtime, so this tiny plugin serves /api/settings/theme and
// /api/theme-css with the same handlers used in production (api/settings/theme.js and
// api/theme-css.js), storing the theme in .theme-data/.
const themeApiDev = () => ({
  name: "theme-api-dev",
  configureServer(server) {
    server.middlewares.use("/api/settings/theme", async (req, res) => {
      const { default: handler } = await server.ssrLoadModule("/api/settings/theme.js");
      await handler(req, res);
    });
    server.middlewares.use("/api/theme-css", async (req, res) => {
      const { default: handler } = await server.ssrLoadModule("/api/theme-css.js");
      await handler(req, res);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), themeApiDev()],
});