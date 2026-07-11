import { defineConfig } from "vite";

/**
 * Multi-page build. Each game is an independent entry (own HTML + bundle) so
 * initialization, debugging, and future per-game UI/assets/config stay
 * separate. The root page (`index.html`) is a launcher that links to them.
 *
 * Input paths are relative to the project root.
 */
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        mindhack: "mindhack.html",
        tetris: "tetris.html",
        chess: "chess.html",
        checkers: "checkers.html",
        crossy: "crossy.html",
        "anomaly-research": "anomaly-research.html",
      },
    },
  },
});
