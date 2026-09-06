import { defineConfig, loadEnv } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 20000,
  },
});
