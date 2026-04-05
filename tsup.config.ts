import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/lib.ts"],

  /* Output formats */
  format: ["esm", "cjs"],

  /* Generate type definitions */
  dts: true,

  /* Clean dist folder before build */
  clean: true,

  /* Enable sourcemaps */
  sourcemap: true,

  /* Target modern Node */
  target: "node18",

  /* Don't bundle node built-ins */
  platform: "node",

  /* Keep external dependencies external */
  external: ["ejs", "ws"],

  /* Tree-shaking */
  splitting: false,

  /* Minify optional (can enable later) */
  minify: false,

  /* Build output directory */
  outDir: "dist",
});
