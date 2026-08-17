import { defineConfig } from "vitest/config";

// Config própria para não herdar a da raiz, que é do frontend (jsdom +
// setupFiles com mocks de PWA/serviceWorker). Este serviço roda em Node puro.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
